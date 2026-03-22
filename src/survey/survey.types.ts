export type InterviewStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'review_pending';

export type InterviewChannel =
  | 'manual'
  | 'voice_upload'
  | 'voice_assisted'
  | 'imported';

export type QuestionType =
  | 'nps'
  | 'scale'
  | 'single_choice'
  | 'multi_choice'
  | 'text'
  | 'number'
  | 'boolean';

export type RuleOperator =
  | 'equals'
  | 'not_equals'
  | 'in'
  | 'not_in'
  | 'gte'
  | 'lte'
  | 'gt'
  | 'lt';

export interface DisplayCondition {
  question_id: string;
  operator: RuleOperator;
  value: unknown;
}

export interface QuestionScale {
  min: number;
  max: number;
}

export interface Question {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
  scale?: QuestionScale;
  display_condition?: DisplayCondition;
}

export interface QuestionnaireSchema {
  meta?: Record<string, unknown>;
  questions: Question[];
}

export interface AnswerState {
  question_id: string;
  value: unknown;
  validated: boolean;
  timestamp: string;
}

export interface InterviewSession {
  interview_id: string;
  tenant_id: string;
  campaign_id: string;
  questionnaire_version_id: string;
  respondent_id: string;
  current_question_id: string | null;
  completed: boolean;
  progress: number;
  answers: AnswerState[];
}

export interface StartInterviewInput {
  tenant_id: string;
  campaign_id: string;
  action_id?: string;
  respondent_id: string;
  channel?: InterviewChannel;
  interviewer_user_id?: string;
}

export interface SubmitAnswerInput {
  tenant_id: string;
  question_id: string;
  value: unknown;
}

export interface TenantScopedInput {
  tenant_id: string;
}

export interface InterviewRecord {
  id: string;
  tenant_id: string;
  campaign_id: string;
  action_id: string | null;
  questionnaire_version_id: string;
  respondent_id: string;
  channel: string;
  status: InterviewStatus;
  interviewer_user_id: string | null;
  started_at: Date | null;
  completed_at: Date | null;
}

export interface StoredAnswerRecord {
  question_id: string;
  answer_type: QuestionType;
  value_numeric: number | null;
  value_text: string | null;
  value_boolean: boolean | null;
  value_json: unknown | null;
  created_at: Date;
}

export interface CampaignContext {
  id: string;
  tenant_id: string;
  questionnaire_version_id: string;
}

export interface CreateInterviewParams {
  tenant_id: string;
  campaign_id: string;
  action_id?: string;
  questionnaire_version_id: string;
  respondent_id: string;
  channel: InterviewChannel;
  interviewer_user_id?: string;
}

export interface PersistAnswerParams {
  tenant_id: string;
  campaign_id: string;
  interview_id: string;
  questionnaire_version_id: string;
  question_id: string;
  answer_type: QuestionType;
  value_numeric: number | null;
  value_text: string | null;
  value_boolean: boolean | null;
  value_json: unknown | null;
  raw_json: Record<string, unknown>;
}

export interface CreateProcessingJobParams {
  tenant_id: string;
  campaign_id: string;
  interview_id: string;
  job_type: 'ai_enrichment';
  payload_json: Record<string, unknown>;
}

