import {
  CampaignContext,
  CreateInterviewParams,
  CreateProcessingJobParams,
  InterviewRecord,
  PersistAnswerParams,
  QuestionnaireSchema,
  StoredAnswerRecord,
} from '../survey.types';

export interface SurveyRepository {
  getCampaignContext(tenantId: string, campaignId: string): Promise<CampaignContext | null>;
  getActionContext(tenantId: string, actionId: string): Promise<CampaignContext | null>;
  respondentExists(tenantId: string, campaignId: string, respondentId: string): Promise<boolean>;
  respondentExistsByAction(tenantId: string, actionId: string, respondentId: string): Promise<boolean>;
  getQuestionnaireSchema(questionnaireVersionId: string): Promise<QuestionnaireSchema | null>;
  createInterview(params: CreateInterviewParams): Promise<InterviewRecord>;
  getInterview(interviewId: string): Promise<InterviewRecord | null>;
  getAnswers(interviewId: string): Promise<StoredAnswerRecord[]>;
  insertAnswer(params: PersistAnswerParams): Promise<boolean>;
  updateInterviewStatus(interviewId: string, status: string, completedAt: Date | null): Promise<void>;
  createProcessingJob(params: CreateProcessingJobParams): Promise<boolean>;
  findActiveInterview(tenantId: string, campaignId: string, respondentId: string): Promise<InterviewRecord | null>;
}

