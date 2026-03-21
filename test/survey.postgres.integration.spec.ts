import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { RuleEngine } from '../src/survey/rule-engine';
import { PgSurveyRepository } from '../src/survey/repositories/pg-survey.repository';
import { SurveyService } from '../src/survey/survey.service';
import { QuestionnaireSchema } from '../src/survey/survey.types';

const databaseUrl = process.env.DATABASE_URL_TEST;
const describeIfDb = databaseUrl ? describe : describe.skip;

describeIfDb('Survey Runtime Engine (PostgreSQL integration)', () => {
  let pool: Pool;
  let service: SurveyService;

  const tenantId = randomUUID();
  const questionnaireId = randomUUID();
  const questionnaireVersionId = randomUUID();
  const campaignId = randomUUID();
  const respondentId = randomUUID();

  let interviewId: string;

  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl });

    const schema: QuestionnaireSchema = {
      meta: { name: 'Test Schema', version: 1 },
      questions: [
        {
          id: 'nps',
          label: 'NPS',
          type: 'nps',
          required: true,
          scale: { min: 0, max: 10 },
        },
        {
          id: 'nps_reason',
          label: 'NPS reason',
          type: 'text',
          required: false,
        },
      ],
    };

    await pool.query(
      `
      INSERT INTO core.tenant (id, name, code, status, timezone, settings_json)
      VALUES ($1, $2, $3, 'active', 'America/Sao_Paulo', '{}'::jsonb)
      `,
      [tenantId, 'Tenant Test', `TENANT_${tenantId.slice(0, 8).toUpperCase()}`],
    );

    await pool.query(
      `
      INSERT INTO core.questionnaire (id, tenant_id, name, description, status)
      VALUES ($1, $2, 'Questionnaire Test', NULL, 'published')
      `,
      [questionnaireId, tenantId],
    );

    await pool.query(
      `
      INSERT INTO core.questionnaire_version (id, questionnaire_id, version_number, status, schema_json, published_at)
      VALUES ($1, $2, 1, 'published', $3::jsonb, NOW())
      `,
      [questionnaireVersionId, questionnaireId, JSON.stringify(schema)],
    );

    await pool.query(
      `
      INSERT INTO core.campaign (
        id,
        tenant_id,
        name,
        description,
        status,
        questionnaire_version_id,
        channel_config_json
      )
      VALUES ($1, $2, 'Campaign Test', NULL, 'active', $3, '{}'::jsonb)
      `,
      [campaignId, tenantId, questionnaireVersionId],
    );

    await pool.query(
      `
      INSERT INTO core.respondent (id, tenant_id, campaign_id, name, metadata_json)
      VALUES ($1, $2, $3, 'Respondent Test', '{}'::jsonb)
      `,
      [respondentId, tenantId, campaignId],
    );

    const repository = new PgSurveyRepository(pool);
    service = new SurveyService(repository, new RuleEngine());
  });

  afterAll(async () => {
    if (interviewId) {
      await pool.query(`DELETE FROM core.processing_job WHERE interview_id = $1`, [interviewId]);
      await pool.query(`DELETE FROM core.answer WHERE interview_id = $1`, [interviewId]);
      await pool.query(`DELETE FROM core.interview WHERE id = $1`, [interviewId]);
    }
    await pool.query(`DELETE FROM core.respondent WHERE id = $1`, [respondentId]);
    await pool.query(`DELETE FROM core.campaign WHERE id = $1`, [campaignId]);
    await pool.query(`DELETE FROM core.questionnaire_version WHERE id = $1`, [questionnaireVersionId]);
    await pool.query(`DELETE FROM core.questionnaire WHERE id = $1`, [questionnaireId]);
    await pool.query(`DELETE FROM core.tenant WHERE id = $1`, [tenantId]);

    await pool.end();
  });

  it('starts, answers and completes interview with persisted processing job', async () => {
    const start = await service.startInterview({
      tenant_id: tenantId,
      campaign_id: campaignId,
      respondent_id: respondentId,
      channel: 'manual',
    });

    interviewId = start.interview_state.interview_id;
    expect(start.next_question?.id).toBe('nps');

    const afterAnswer = await service.answerQuestion(interviewId, {
      tenant_id: tenantId,
      question_id: 'nps',
      value: 9,
    });

    expect(afterAnswer.interview_state.answers).toHaveLength(1);

    const completed = await service.completeInterview(interviewId, {
      tenant_id: tenantId,
    });

    expect(completed.interview_state.completed).toBe(true);
    expect(completed.interview_state.progress).toBe(100);

    const job = await pool.query(
      `
      SELECT id
      FROM core.processing_job
      WHERE interview_id = $1
        AND job_type = 'ai_enrichment'
      LIMIT 1
      `,
      [interviewId],
    );

    expect(job.rowCount).toBe(1);
  });
});
