import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { SURVEY_REPOSITORY } from '../src/survey/repositories/repository.tokens';
import { RuleEngine } from '../src/survey/rule-engine';
import { SurveyController } from '../src/survey/survey.controller';
import { SurveyService } from '../src/survey/survey.service';
import { QuestionnaireSchema } from '../src/survey/survey.types';
import { InMemorySurveyRepository } from './support/in-memory-survey.repository';

describe('Survey Runtime Engine (integration)', () => {
  let app: INestApplication;
  let repository: InMemorySurveyRepository;

  beforeAll(async () => {
    const schema: QuestionnaireSchema = {
      meta: { name: 'NPS Revendas', version: 1 },
      questions: [
        {
          id: 'nps',
          label: 'Qual é a chance de recomendar?',
          type: 'nps',
          required: true,
          scale: { min: 0, max: 10 },
        },
        {
          id: 'nps_reason',
          label: 'Motivo da nota?',
          type: 'text',
          required: false,
        },
        {
          id: 'ease_business',
          label: 'Facilidade de fazer negócio',
          type: 'single_choice',
          required: true,
          options: ['muito_facil', 'facil', 'nem_facil_nem_dificil', 'dificil', 'extremamente_dificil'],
        },
        {
          id: 'difficulty_reason',
          label: 'Motivo da dificuldade',
          type: 'text',
          required: false,
          display_condition: {
            question_id: 'ease_business',
            operator: 'in',
            value: ['dificil', 'extremamente_dificil'],
          },
        },
        {
          id: 'service_satisfaction',
          label: 'Satisfação do atendimento',
          type: 'scale',
          required: true,
          scale: { min: 1, max: 5 },
        },
      ],
    };

    repository = new InMemorySurveyRepository({
      campaigns: [
        {
          id: 'campaign-1',
          tenant_id: 'tenant-1',
          questionnaire_version_id: 'qv-1',
        },
      ],
      respondents: [{ id: 'respondent-1', tenant_id: 'tenant-1', campaign_id: 'campaign-1' }],
      questionnaireSchemas: { 'qv-1': schema },
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [SurveyController],
      providers: [
        SurveyService,
        RuleEngine,
        {
          provide: SURVEY_REPOSITORY,
          useValue: repository,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('runs full interview flow and enqueue processing job on complete', async () => {
    const startResponse = await request(app.getHttpServer())
      .post('/interviews/start')
      .send({
        tenant_id: 'tenant-1',
        campaign_id: 'campaign-1',
        respondent_id: 'respondent-1',
      })
      .expect(201);

    expect(startResponse.body.next_question.id).toBe('nps');
    const interviewId = startResponse.body.interview_state.interview_id as string;

    await request(app.getHttpServer())
      .post(`/interviews/${interviewId}/answer`)
      .send({ tenant_id: 'tenant-1', question_id: 'nps', value: 8 })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/interviews/${interviewId}/answer`)
      .send({ tenant_id: 'tenant-1', question_id: 'ease_business', value: 'facil' })
      .expect(201);

    const complete = await request(app.getHttpServer())
      .post(`/interviews/${interviewId}/complete`)
      .send({ tenant_id: 'tenant-1' })
      .expect(201);

    expect(complete.body.interview_state.completed).toBe(true);
    expect(repository.getProcessingJobs()).toHaveLength(1);
    expect(repository.getProcessingJobs()[0].job_type).toBe('ai_enrichment');
  });
});

