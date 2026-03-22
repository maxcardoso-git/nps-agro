import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { validateAndNormalizeAnswer } from './answer-validation';
import { SURVEY_REPOSITORY } from './repositories/repository.tokens';
import { SurveyRepository } from './repositories/survey.repository';
import { RuleEngine } from './rule-engine';
import { SurveyException } from './survey.errors';
import {
  AnswerState,
  InterviewRecord,
  InterviewSession,
  PersistAnswerParams,
  Question,
  QuestionnaireSchema,
  StartInterviewInput,
  StoredAnswerRecord,
  SubmitAnswerInput,
  TenantScopedInput,
} from './survey.types';

export interface SurveyRuntimeResponse {
  next_question: Question | null;
  interview_state: InterviewSession;
}

@Injectable()
export class SurveyService {
  private readonly logger = new Logger(SurveyService.name);

  constructor(
    @Inject(SURVEY_REPOSITORY) private readonly repository: SurveyRepository,
    private readonly ruleEngine: RuleEngine,
  ) {}

  async startInterview(input: StartInterviewInput): Promise<SurveyRuntimeResponse> {
    this.assertNonEmpty(input.tenant_id, 'tenant_id');
    this.assertNonEmpty(input.campaign_id, 'campaign_id');
    this.assertNonEmpty(input.respondent_id, 'respondent_id');

    const campaign = await this.repository.getCampaignContext(input.tenant_id, input.campaign_id);
    if (!campaign) {
      throw new SurveyException('CAMPAIGN_NOT_FOUND', 'Campaign not found for tenant', HttpStatus.NOT_FOUND);
    }

    const respondentExists = await this.repository.respondentExists(
      input.tenant_id,
      input.campaign_id,
      input.respondent_id,
    );
    if (!respondentExists) {
      throw new SurveyException(
        'RESPONDENT_NOT_FOUND',
        'Respondent not found for campaign and tenant',
        HttpStatus.NOT_FOUND,
      );
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
      this.logger.log(
        `QUESTION_RESOLVED interview_id=${interview.id} question_id=${response.next_question.id}`,
      );
    }
    return response;
  }

  async answerQuestion(interviewId: string, input: SubmitAnswerInput): Promise<SurveyRuntimeResponse> {
    this.assertNonEmpty(interviewId, 'interview_id');
    this.assertNonEmpty(input.tenant_id, 'tenant_id');
    this.assertNonEmpty(input.question_id, 'question_id');

    const interview = await this.getInterviewOrThrow(interviewId, input.tenant_id);
    this.assertInterviewAnswerable(interview.status);

    const schema = await this.repository.getQuestionnaireSchema(interview.questionnaire_version_id);
    this.assertSchema(schema);

    const answers = await this.repository.getAnswers(interviewId);
    const answerMap = this.toAnswerMap(answers);

    const question = schema.questions.find((item) => item.id === input.question_id);
    if (!question) {
      throw new SurveyException('QUESTION_NOT_FOUND', 'Question does not exist in schema', HttpStatus.NOT_FOUND);
    }

    const visible = this.ruleEngine.shouldDisplayQuestion(question, answerMap);
    if (!visible) {
      throw new SurveyException('QUESTION_NOT_VISIBLE', 'Question is not currently visible');
    }

    const normalizedValue = validateAndNormalizeAnswer(question, input.value);
    const persistPayload = this.buildPersistAnswerPayload(interview, question, normalizedValue);

    const inserted = await this.repository.insertAnswer(persistPayload);
    if (!inserted) {
      throw new SurveyException('DUPLICATE_ANSWER', 'Question already answered for this interview');
    }

    const updatedAnswers = await this.repository.getAnswers(interview.id);
    const response = this.buildRuntimeResponse(interview, schema, updatedAnswers);
    this.logger.log(`ANSWER_SUBMITTED interview_id=${interview.id} question_id=${question.id}`);
    if (response.next_question) {
      this.logger.log(
        `QUESTION_RESOLVED interview_id=${interview.id} question_id=${response.next_question.id}`,
      );
    }
    return response;
  }

  async nextQuestion(interviewId: string, input: TenantScopedInput): Promise<SurveyRuntimeResponse> {
    this.assertNonEmpty(interviewId, 'interview_id');
    this.assertNonEmpty(input.tenant_id, 'tenant_id');

    const interview = await this.getInterviewOrThrow(interviewId, input.tenant_id);
    const schema = await this.repository.getQuestionnaireSchema(interview.questionnaire_version_id);
    this.assertSchema(schema);

    const answers = await this.repository.getAnswers(interview.id);
    const response = this.buildRuntimeResponse(interview, schema, answers);
    if (response.next_question) {
      this.logger.log(
        `QUESTION_RESOLVED interview_id=${interview.id} question_id=${response.next_question.id}`,
      );
    }
    return response;
  }

  async completeInterview(interviewId: string, input: TenantScopedInput): Promise<SurveyRuntimeResponse> {
    this.assertNonEmpty(interviewId, 'interview_id');
    this.assertNonEmpty(input.tenant_id, 'tenant_id');

    const interview = await this.getInterviewOrThrow(interviewId, input.tenant_id);
    if (interview.status !== 'in_progress') {
      throw new SurveyException(
        'INVALID_STATE_TRANSITION',
        `Interview in status ${interview.status} cannot be completed`,
      );
    }

    const schema = await this.repository.getQuestionnaireSchema(interview.questionnaire_version_id);
    this.assertSchema(schema);

    const answers = await this.repository.getAnswers(interview.id);
    const answerMap = this.toAnswerMap(answers);

    const missingRequired = schema.questions
      .filter((question) => question.required)
      .filter((question) => this.ruleEngine.shouldDisplayQuestion(question, answerMap))
      .filter((question) => !this.hasAnswered(answerMap.get(question.id)));

    if (missingRequired.length > 0) {
      throw new SurveyException(
        'REQUIRED_QUESTION_MISSING',
        'Required questions must be answered before completion',
        HttpStatus.BAD_REQUEST,
        { question_ids: missingRequired.map((item) => item.id) },
      );
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

  private buildRuntimeResponse(
    interview: InterviewRecord,
    schema: QuestionnaireSchema,
    answers: StoredAnswerRecord[],
  ): SurveyRuntimeResponse {
    const answerMap = this.toAnswerMap(answers);
    const nextQuestion = this.resolveNextQuestion(schema, answerMap);
    const interviewState = this.buildInterviewState(interview, schema, answers, answerMap, nextQuestion?.id ?? null);
    return {
      next_question: nextQuestion,
      interview_state: interviewState,
    };
  }

  private buildInterviewState(
    interview: InterviewRecord,
    schema: QuestionnaireSchema,
    answers: StoredAnswerRecord[],
    answersByQuestionId: Map<string, unknown>,
    currentQuestionId: string | null,
  ): InterviewSession {
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

  private calculateProgress(schema: QuestionnaireSchema, answersByQuestionId: Map<string, unknown>): number {
    const requiredVisibleQuestions = schema.questions
      .filter((question) => question.required)
      .filter((question) => this.ruleEngine.shouldDisplayQuestion(question, answersByQuestionId));

    if (requiredVisibleQuestions.length === 0) {
      return 100;
    }

    const answeredRequired = requiredVisibleQuestions.filter((question) =>
      this.hasAnswered(answersByQuestionId.get(question.id)),
    ).length;

    const progress = (answeredRequired / requiredVisibleQuestions.length) * 100;
    return Math.round(progress * 100) / 100;
  }

  private toAnswerState(answers: StoredAnswerRecord[]): AnswerState[] {
    return answers.map((answer) => ({
      question_id: answer.question_id,
      value: this.extractValue(answer),
      validated: true,
      timestamp: answer.created_at.toISOString(),
    }));
  }

  private resolveNextQuestion(schema: QuestionnaireSchema, answersByQuestionId: Map<string, unknown>): Question | null {
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

  private toAnswerMap(answers: StoredAnswerRecord[]): Map<string, unknown> {
    const map = new Map<string, unknown>();
    for (const answer of answers) {
      map.set(answer.question_id, this.extractValue(answer));
    }
    return map;
  }

  private extractValue(answer: StoredAnswerRecord): unknown {
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

  private buildPersistAnswerPayload(
    interview: InterviewRecord,
    question: Question,
    value: unknown,
  ): PersistAnswerParams {
    return {
      tenant_id: interview.tenant_id,
      campaign_id: interview.campaign_id,
      interview_id: interview.id,
      questionnaire_version_id: interview.questionnaire_version_id,
      question_id: question.id,
      answer_type: question.type,
      value_numeric:
        question.type === 'nps' || question.type === 'scale' || question.type === 'number'
          ? Number(value)
          : null,
      value_text:
        question.type === 'single_choice' || question.type === 'text' ? String(value) : null,
      value_boolean: question.type === 'boolean' ? Boolean(value) : null,
      value_json: question.type === 'multi_choice' ? value : null,
      raw_json: { value },
    };
  }

  private hasAnswered(value: unknown): boolean {
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

  private assertInterviewAnswerable(status: string): void {
    if (status !== 'in_progress' && status !== 'not_started') {
      throw new SurveyException(
        'INVALID_STATE_TRANSITION',
        `Interview in status ${status} cannot accept answers`,
      );
    }
  }

  private async getInterviewOrThrow(interviewId: string, tenantId: string): Promise<InterviewRecord> {
    const interview = await this.repository.getInterview(interviewId);
    if (!interview) {
      throw new SurveyException('INTERVIEW_NOT_FOUND', 'Interview does not exist', HttpStatus.NOT_FOUND);
    }
    if (interview.tenant_id !== tenantId) {
      throw new SurveyException('CROSS_TENANT_ACCESS_DENIED', 'Interview does not belong to tenant', HttpStatus.FORBIDDEN);
    }
    return interview;
  }

  private assertSchema(schema: QuestionnaireSchema | null): asserts schema is QuestionnaireSchema {
    if (!schema || !Array.isArray(schema.questions)) {
      throw new SurveyException(
        'QUESTIONNAIRE_VERSION_NOT_FOUND',
        'Questionnaire version schema not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private assertNonEmpty(value: string | undefined, field: string): void {
    if (!value || value.trim().length === 0) {
      throw new SurveyException('INVALID_INPUT', `${field} is required`);
    }
  }
}

