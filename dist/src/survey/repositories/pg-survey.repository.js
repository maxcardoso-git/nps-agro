"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PgSurveyRepository = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
const repository_tokens_1 = require("./repository.tokens");
let PgSurveyRepository = class PgSurveyRepository {
    constructor(pool) {
        this.pool = pool;
    }
    async getCampaignContext(tenantId, campaignId) {
        const result = await this.pool.query(`
      SELECT id, tenant_id, questionnaire_version_id
      FROM core.campaign
      WHERE id = $1
        AND tenant_id = $2
      LIMIT 1
      `, [campaignId, tenantId]);
        if (result.rowCount === 0) {
            return null;
        }
        return result.rows[0];
    }
    async respondentExists(tenantId, campaignId, respondentId) {
        const result = await this.pool.query(`
      SELECT 1
      FROM core.respondent
      WHERE id = $1
        AND campaign_id = $2
        AND tenant_id = $3
      LIMIT 1
      `, [respondentId, campaignId, tenantId]);
        return (result.rowCount ?? 0) > 0;
    }
    async getQuestionnaireSchema(questionnaireVersionId) {
        const result = await this.pool.query(`
      SELECT schema_json
      FROM core.questionnaire_version
      WHERE id = $1
      LIMIT 1
      `, [questionnaireVersionId]);
        if (result.rowCount === 0) {
            return null;
        }
        return result.rows[0].schema_json;
    }
    async createInterview(params) {
        const result = await this.pool.query(`
      INSERT INTO core.interview (
        tenant_id,
        campaign_id,
        questionnaire_version_id,
        respondent_id,
        channel,
        status,
        interviewer_user_id,
        started_at
      )
      VALUES ($1, $2, $3, $4, $5, 'in_progress', $6, NOW())
      RETURNING
        id,
        tenant_id,
        campaign_id,
        questionnaire_version_id,
        respondent_id,
        channel,
        status,
        interviewer_user_id,
        started_at,
        completed_at
      `, [
            params.tenant_id,
            params.campaign_id,
            params.questionnaire_version_id,
            params.respondent_id,
            params.channel,
            params.interviewer_user_id ?? null,
        ]);
        return result.rows[0];
    }
    async getInterview(interviewId) {
        const result = await this.pool.query(`
      SELECT
        id,
        tenant_id,
        campaign_id,
        questionnaire_version_id,
        respondent_id,
        channel,
        status,
        interviewer_user_id,
        started_at,
        completed_at
      FROM core.interview
      WHERE id = $1
      LIMIT 1
      `, [interviewId]);
        if (result.rowCount === 0) {
            return null;
        }
        return result.rows[0];
    }
    async getAnswers(interviewId) {
        const result = await this.pool.query(`
      SELECT
        question_id,
        answer_type,
        value_numeric,
        value_text,
        value_boolean,
        value_json,
        created_at
      FROM core.answer
      WHERE interview_id = $1
      ORDER BY created_at ASC
      `, [interviewId]);
        return result.rows;
    }
    async insertAnswer(params) {
        const result = await this.pool.query(`
      INSERT INTO core.answer (
        tenant_id,
        campaign_id,
        interview_id,
        questionnaire_version_id,
        question_id,
        answer_type,
        value_numeric,
        value_text,
        value_boolean,
        value_json,
        raw_json
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11
      )
      ON CONFLICT (interview_id, question_id) DO NOTHING
      RETURNING id
      `, [
            params.tenant_id,
            params.campaign_id,
            params.interview_id,
            params.questionnaire_version_id,
            params.question_id,
            params.answer_type,
            params.value_numeric,
            params.value_text,
            params.value_boolean,
            params.value_json ? JSON.stringify(params.value_json) : null,
            JSON.stringify(params.raw_json),
        ]);
        return (result.rowCount ?? 0) > 0;
    }
    async updateInterviewStatus(interviewId, status, completedAt) {
        await this.pool.query(`
      UPDATE core.interview
      SET
        status = $2,
        completed_at = $3,
        updated_at = NOW()
      WHERE id = $1
      `, [interviewId, status, completedAt]);
    }
    async createProcessingJob(params) {
        const result = await this.pool.query(`
      INSERT INTO core.processing_job (
        tenant_id,
        campaign_id,
        interview_id,
        job_type,
        status,
        payload_json
      )
      SELECT
        $1, $2, $3, $4, 'queued', $5
      WHERE NOT EXISTS (
        SELECT 1
        FROM core.processing_job
        WHERE interview_id = $3
          AND job_type = $4
      )
      RETURNING id
      `, [
            params.tenant_id,
            params.campaign_id,
            params.interview_id,
            params.job_type,
            JSON.stringify(params.payload_json),
        ]);
        return (result.rowCount ?? 0) > 0;
    }
};
exports.PgSurveyRepository = PgSurveyRepository;
exports.PgSurveyRepository = PgSurveyRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(repository_tokens_1.PG_POOL)),
    __metadata("design:paramtypes", [pg_1.Pool])
], PgSurveyRepository);
//# sourceMappingURL=pg-survey.repository.js.map