import { randomUUID } from 'node:crypto';
import { SurveyRepository } from '../../src/survey/repositories/survey.repository';
import {
  CampaignContext,
  CreateInterviewParams,
  CreateProcessingJobParams,
  InterviewRecord,
  PersistAnswerParams,
  QuestionnaireSchema,
  StoredAnswerRecord,
} from '../../src/survey/survey.types';

interface SeedData {
  campaigns: CampaignContext[];
  respondents: Array<{ id: string; tenant_id: string; campaign_id: string }>;
  questionnaireSchemas: Record<string, QuestionnaireSchema>;
}

export class InMemorySurveyRepository implements SurveyRepository {
  private readonly campaigns: CampaignContext[];
  private readonly respondents: Array<{ id: string; tenant_id: string; campaign_id: string }>;
  private readonly questionnaireSchemas: Record<string, QuestionnaireSchema>;
  private readonly interviews = new Map<string, InterviewRecord>();
  private readonly answers = new Map<string, StoredAnswerRecord[]>();
  private readonly processingJobs: CreateProcessingJobParams[] = [];

  constructor(seed: SeedData) {
    this.campaigns = seed.campaigns;
    this.respondents = seed.respondents;
    this.questionnaireSchemas = seed.questionnaireSchemas;
  }

  async getCampaignContext(tenantId: string, campaignId: string): Promise<CampaignContext | null> {
    const found = this.campaigns.find((item) => item.id === campaignId && item.tenant_id === tenantId);
    return found ?? null;
  }

  async respondentExists(tenantId: string, campaignId: string, respondentId: string): Promise<boolean> {
    return this.respondents.some(
      (item) =>
        item.id === respondentId &&
        item.tenant_id === tenantId &&
        item.campaign_id === campaignId,
    );
  }

  async getQuestionnaireSchema(questionnaireVersionId: string): Promise<QuestionnaireSchema | null> {
    return this.questionnaireSchemas[questionnaireVersionId] ?? null;
  }

  async createInterview(params: CreateInterviewParams): Promise<InterviewRecord> {
    const interview: InterviewRecord = {
      id: randomUUID(),
      tenant_id: params.tenant_id,
      campaign_id: params.campaign_id,
      questionnaire_version_id: params.questionnaire_version_id,
      respondent_id: params.respondent_id,
      channel: params.channel,
      status: 'in_progress',
      interviewer_user_id: params.interviewer_user_id ?? null,
      started_at: new Date(),
      completed_at: null,
    };

    this.interviews.set(interview.id, interview);
    this.answers.set(interview.id, []);
    return interview;
  }

  async getInterview(interviewId: string): Promise<InterviewRecord | null> {
    return this.interviews.get(interviewId) ?? null;
  }

  async getAnswers(interviewId: string): Promise<StoredAnswerRecord[]> {
    return this.answers.get(interviewId) ?? [];
  }

  async insertAnswer(params: PersistAnswerParams): Promise<boolean> {
    const interviewAnswers = this.answers.get(params.interview_id) ?? [];
    const exists = interviewAnswers.some((item) => item.question_id === params.question_id);
    if (exists) {
      return false;
    }

    interviewAnswers.push({
      question_id: params.question_id,
      answer_type: params.answer_type,
      value_numeric: params.value_numeric,
      value_text: params.value_text,
      value_boolean: params.value_boolean,
      value_json: params.value_json,
      created_at: new Date(),
    });
    this.answers.set(params.interview_id, interviewAnswers);
    return true;
  }

  async updateInterviewStatus(interviewId: string, status: string, completedAt: Date | null): Promise<void> {
    const interview = this.interviews.get(interviewId);
    if (!interview) {
      return;
    }

    interview.status = status as InterviewRecord['status'];
    interview.completed_at = completedAt;
    this.interviews.set(interviewId, interview);
  }

  async createProcessingJob(params: CreateProcessingJobParams): Promise<boolean> {
    const exists = this.processingJobs.some(
      (item) => item.interview_id === params.interview_id && item.job_type === params.job_type,
    );
    if (exists) {
      return false;
    }
    this.processingJobs.push(params);
    return true;
  }

  getProcessingJobs(): CreateProcessingJobParams[] {
    return this.processingJobs;
  }
}

