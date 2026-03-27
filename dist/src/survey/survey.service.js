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
var SurveyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SurveyService = void 0;
const common_1 = require("@nestjs/common");
const answer_validation_1 = require("./answer-validation");
const survey_errors_1 = require("./survey.errors");
const rule_engine_1 = require("./rule-engine");
const repository_tokens_1 = require("./repositories/repository.tokens");
let SurveyService = SurveyService_1 = class SurveyService {
    constructor(repository, ruleEngine) {
        this.repository = repository;
        this.ruleEngine = ruleEngine;
        this.logger = new common_1.Logger(SurveyService_1.name);
    }
    async startInterview(input) {
        this.assertNonEmpty(input.tenant_id, 'tenant_id');
        this.assertNonEmpty(input.campaign_id, 'campaign_id');
        this.assertNonEmpty(input.respondent_id, 'respondent_id');
        const campaign = await this.repository.getCampaignContext(input.tenant_id, input.campaign_id);
        if (!campaign) {
            throw new survey_errors_1.SurveyException('CAMPAIGN_NOT_FOUND', 'Campaign not found for tenant', common_1.HttpStatus.NOT_FOUND);
        }
        const respondentExists = await this.repository.respondentExists(input.tenant_id, input.campaign_id, input.respondent_id);
        if (!respondentExists) {
            throw new survey_errors_1.SurveyException('RESPONDENT_NOT_FOUND', 'Respondent not found for campaign and tenant', common_1.HttpStatus.NOT_FOUND);
        }
        const schema = await this.repository.getQuestionnaireSchema(campaign.questionnaire_version_id);
        this.assertSchema(schema);
        const interview = await this.repository.createInterview({
            tenant_id: input.tenant_id,
            campaign_id: input.campaign_id,
            questionnaire_version_id: campaign.questionnaire_version_id,
            respondent_id: input.respondent_id,
            channel: input.channel ?? 'manual',
            interviewer_user_id: input.interviewer_user_id,
        });
        const answers = await this.repository.getAnswers(interview.id);
        const response = this.buildRuntimeResponse(interview, schema, answers);
        this.logger.log(`INTERVIEW_STARTED interview_id=${interview.id} tenant_id=${interview.tenant_id}`);
        if (response.next_question) {
            this.logger.log(`QUESTION_RESOLVED interview_id=${interview.id} question_id=${response.next_question.id}`);
        }
        return response;
    }
    async answerQuestion(interviewId, input) {
        this.assertNonEmpty(interviewId, 'interview_id');
        this.assertNonEmpty(input.tenant_id, 'tenant_id');
        this.assertNonEmpty(input.question_id, 'question_id');
        const interview = await this.getInterviewOrThrow(interviewId, input.tenant_id);
        this.assertInterviewAnswerable(interview.status);
        const schema = await this.repository.getQuestionnaireSchema(interview.questionnaire_version_id);
        this.assertSchema(schema);
        const answers = await this.repository.getAnswers(interviewId);
        const answerMap = this.toAnswerMap(answers);
        const question = schema.questions.find((q) => q.id === input.question_id);
        if (!question) {
            throw new survey_errors_1.SurveyException('QUESTION_NOT_FOUND', 'Question does not exist in schema', common_1.HttpStatus.NOT_FOUND);
        }
        const visible = this.ruleEngine.shouldDisplayQuestion(question, answerMap);
        if (!visible) {
            throw new survey_errors_1.SurveyException('QUESTION_NOT_VISIBLE', 'Question is not currently visible');
        }
        const normalizedValue = (0, answer_validation_1.validateAndNormalizeAnswer)(question, input.value);
        const persistPayload = this.buildPersistAnswerPayload(interview, question, normalizedValue);
        const inserted = await this.repository.insertAnswer(persistPayload);
        if (!inserted) {
            throw new survey_errors_1.SurveyException('DUPLICATE_ANSWER', 'Question already answered for this interview');
        }
        const updatedAnswers = await this.repository.getAnswers(interview.id);
        const response = this.buildRuntimeResponse(interview, schema, updatedAnswers);
        this.logger.log(`ANSWER_SUBMITTED interview_id=${interview.id} question_id=${question.id}`);
        if (response.next_question) {
            this.logger.log(`QUESTION_RESOLVED interview_id=${interview.id} question_id=${response.next_question.id}`);
        }
        return response;
    }
    async nextQuestion(interviewId, input) {
        this.assertNonEmpty(interviewId, 'interview_id');
        this.assertNonEmpty(input.tenant_id, 'tenant_id');
        const interview = await this.getInterviewOrThrow(interviewId, input.tenant_id);
        const schema = await this.repository.getQuestionnaireSchema(interview.questionnaire_version_id);
        this.assertSchema(schema);
        const answers = await this.repository.getAnswers(interview.id);
        const response = this.buildRuntimeResponse(interview, schema, answers);
        if (response.next_question) {
            this.logger.log(`QUESTION_RESOLVED interview_id=${interview.id} question_id=${response.next_question.id}`);
        }
        return response;
    }
    async completeInterview(interviewId, input) {
        this.assertNonEmpty(interviewId, 'interview_id');
        this.assertNonEmpty(input.tenant_id, 'tenant_id');
        const interview = await this.getInterviewOrThrow(interviewId, input.tenant_id);
        if (interview.status !== 'in_progress') {
            throw new survey_errors_1.SurveyException('INVALID_STATE_TRANSITION', `Interview in status ${interview.status} cannot be completed`);
        }
        const schema = await this.repository.getQuestionnaireSchema(interview.questionnaire_version_id);
        this.assertSchema(schema);
        const answers = await this.repository.getAnswers(interview.id);
        const answerMap = this.toAnswerMap(answers);
        const missingRequired = schema.questions
            .filter((q) => q.required)
            .filter((q) => this.ruleEngine.shouldDisplayQuestion(q, answerMap))
            .filter((q) => !this.hasAnswered(answerMap.get(q.id)));
        if (missingRequired.length > 0) {
            throw new survey_errors_1.SurveyException('REQUIRED_QUESTION_MISSING', 'Required questions must be answered before completion', common_1.HttpStatus.BAD_REQUEST, { question_ids: missingRequired.map((q) => q.id) });
        }
        await this.repository.updateInterviewStatus(interview.id, 'completed', new Date());
        await this.repository.createProcessingJob({
            tenant_id: interview.tenant_id,
            campaign_id: interview.campaign_id,
            interview_id: interview.id,
            job_type: 'ai_enrichment',
            payload_json: {
                trigger: 'interview_complete',
                questionnaire_version_id: interview.questionnaire_version_id,
            },
        });
        const finalizedInterview = await this.getInterviewOrThrow(interview.id, input.tenant_id);
        const response = this.buildRuntimeResponse(finalizedInterview, schema, answers);
        response.next_question = null;
        response.interview_state.current_question_id = null;
        response.interview_state.completed = true;
        response.interview_state.progress = 100;
        this.logger.log(`INTERVIEW_COMPLETED interview_id=${finalizedInterview.id}`);
        return response;
    }
    buildRuntimeResponse(interview, schema, answers) {
        const answerMap = this.toAnswerMap(answers);
        const nextQuestion = this.resolveNextQuestion(schema, answerMap);
        const interviewState = this.buildInterviewState(interview, schema, answers, answerMap, nextQuestion?.id ?? null);
        return {
            next_question: nextQuestion,
            interview_state: interviewState,
        };
    }
    buildInterviewState(interview, schema, answers, answersByQuestionId, currentQuestionId) {
        return {
            interview_id: interview.id,
            tenant_id: interview.tenant_id,
            campaign_id: interview.campaign_id,
            questionnaire_version_id: interview.questionnaire_version_id,
            respondent_id: interview.respondent_id,
            current_question_id: currentQuestionId,
            completed: interview.status === 'completed',
            progress: this.calculateProgress(schema, answersByQuestionId),
            answers: this.toAnswerState(answers),
        };
    }
    calculateProgress(schema, answersByQuestionId) {
        const requiredVisibleQuestions = schema.questions
            .filter((q) => q.required)
            .filter((q) => this.ruleEngine.shouldDisplayQuestion(q, answersByQuestionId));
        if (requiredVisibleQuestions.length === 0) {
            return 100;
        }
        const answeredRequired = requiredVisibleQuestions.filter((q) => this.hasAnswered(answersByQuestionId.get(q.id))).length;
        const progress = (answeredRequired / requiredVisibleQuestions.length) * 100;
        return Math.round(progress * 100) / 100;
    }
    toAnswerState(answers) {
        return answers.map((answer) => ({
            question_id: answer.question_id,
            value: this.extractValue(answer),
            validated: true,
            timestamp: answer.created_at.toISOString(),
        }));
    }
    resolveNextQuestion(schema, answersByQuestionId) {
        for (const question of schema.questions) {
            const visible = this.ruleEngine.shouldDisplayQuestion(question, answersByQuestionId);
            if (!visible) {
                continue;
            }
            if (!answersByQuestionId.has(question.id)) {
                return question;
            }
        }
        return null;
    }
    toAnswerMap(answers) {
        const map = new Map();
        for (const answer of answers) {
            map.set(answer.question_id, this.extractValue(answer));
        }
        return map;
    }
    extractValue(answer) {
        if (answer.value_text !== null) {
            return answer.value_text;
        }
        if (answer.value_numeric !== null) {
            return Number(answer.value_numeric);
        }
        if (answer.value_boolean !== null) {
            return answer.value_boolean;
        }
        if (answer.value_json !== null) {
            return answer.value_json;
        }
        return null;
    }
    buildPersistAnswerPayload(interview, question, value) {
        return {
            tenant_id: interview.tenant_id,
            campaign_id: interview.campaign_id,
            interview_id: interview.id,
            questionnaire_version_id: interview.questionnaire_version_id,
            question_id: question.id,
            answer_type: question.type,
            value_numeric: question.type === 'nps' || question.type === 'scale' || question.type === 'number'
                ? Number(value)
                : null,
            value_text: question.type === 'single_choice' || question.type === 'text' ? String(value) : null,
            value_boolean: question.type === 'boolean' ? Boolean(value) : null,
            value_json: question.type === 'multi_choice' ? value : null,
            raw_json: { value },
        };
    }
    hasAnswered(value) {
        if (value === undefined || value === null) {
            return false;
        }
        if (typeof value === 'string') {
            return value.trim().length > 0;
        }
        if (Array.isArray(value)) {
            return value.length > 0;
        }
        return true;
    }
    assertInterviewAnswerable(status) {
        if (status !== 'in_progress' && status !== 'not_started') {
            throw new survey_errors_1.SurveyException('INVALID_STATE_TRANSITION', `Interview in status ${status} cannot accept answers`);
        }
    }
    async getInterviewOrThrow(interviewId, tenantId) {
        const interview = await this.repository.getInterview(interviewId);
        if (!interview) {
            throw new survey_errors_1.SurveyException('INTERVIEW_NOT_FOUND', 'Interview does not exist', common_1.HttpStatus.NOT_FOUND);
        }
        if (interview.tenant_id !== tenantId) {
            throw new survey_errors_1.SurveyException('CROSS_TENANT_ACCESS_DENIED', 'Interview does not belong to tenant', common_1.HttpStatus.FORBIDDEN);
        }
        return interview;
    }
    assertSchema(schema) {
        if (!schema || !Array.isArray(schema.questions)) {
            throw new survey_errors_1.SurveyException('QUESTIONNAIRE_VERSION_NOT_FOUND', 'Questionnaire version schema not found', common_1.HttpStatus.NOT_FOUND);
        }
    }
    assertNonEmpty(value, field) {
        if (!value || value.trim().length === 0) {
            throw new survey_errors_1.SurveyException('INVALID_INPUT', `${field} is required`);
        }
    }
};
exports.SurveyService = SurveyService;
exports.SurveyService = SurveyService = SurveyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(repository_tokens_1.SURVEY_REPOSITORY)),
    __metadata("design:paramtypes", [Object, rule_engine_1.RuleEngine])
], SurveyService);
//# sourceMappingURL=survey.service.js.map