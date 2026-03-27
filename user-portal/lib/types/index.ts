export type Locale = 'pt-BR' | 'en-US' | 'es-ES';

export type Role =
  | 'admin_master'
  | 'platform_admin'
  | 'tenant_admin'
  | 'campaign_manager'
  | 'analyst'
  | 'interviewer';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  tenant_id: string;
  permissions?: string[];
}

export interface AuthSession {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  user: AuthUser;
}

export interface TenantBranding {
  app_name?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  background_color?: string;
  text_color?: string;
}

export interface Tenant {
  id: string;
  name: string;
  code: string;
  settings_json?: {
    branding?: TenantBranding;
    [key: string]: unknown;
  };
}

export interface Campaign {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  segment?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  questionnaire_version_id?: string;
}

export interface RespondentWithStatus {
  id: string;
  tenant_id: string;
  campaign_id: string;
  account_id: string | null;
  external_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  region: string | null;
  city: string | null;
  state: string | null;
  job_title: string | null;
  persona_type: string | null;
  account_name: string | null;
  contact_status: ContactStatus;
  scheduled_at: string | null;
  has_audio?: boolean;
  audio_processed?: boolean | null;
  audio_confidence?: number | null;
}

export type ContactStatus =
  | 'pending'
  | 'success'
  | 'no_answer'
  | 'wrong_number'
  | 'busy'
  | 'scheduled'
  | 'refused'
  | 'in_progress'
  | 'completed';

export type ContactOutcome =
  | 'success'
  | 'no_answer'
  | 'wrong_number'
  | 'busy'
  | 'scheduled'
  | 'refused';

export interface ContactAttempt {
  id: string;
  campaign_id: string;
  respondent_id: string;
  interviewer_user_id: string;
  outcome: ContactOutcome;
  notes: string | null;
  interview_id: string | null;
  scheduled_at: string | null;
  created_at: string;
}

export interface ScheduledCallback {
  id: string;
  respondent_id: string;
  respondent_name: string;
  respondent_phone: string | null;
  campaign_id: string;
  campaign_name: string;
  account_name: string | null;
  scheduled_at: string;
  notes: string | null;
}

export interface InterviewRecord {
  id: string;
  tenant_id: string;
  campaign_id: string;
  questionnaire_version_id: string;
  respondent_id: string;
  channel: string;
  status: string;
  interviewer_user_id: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface Question {
  id: string;
  label: string;
  type: 'nps' | 'scale' | 'single_choice' | 'multi_choice' | 'text' | 'number' | 'boolean';
  required: boolean;
  options?: string[];
  scale?: { min: number; max: number };
  display_condition?: {
    question_id: string;
    operator: string;
    value: unknown;
  };
}

export interface InterviewState {
  interview_id: string;
  tenant_id: string;
  campaign_id: string;
  respondent_id: string;
  completed: boolean;
  progress: number;
}

export interface SurveyRuntimeResponse {
  next_question: Question | null;
  interview_state: InterviewState;
}

export interface ExecutiveSummary {
  campaign: {
    id: string;
    name: string;
    segment?: string | null;
    status: string;
  };
  kpis: {
    nps: number;
    total_interviews: number;
    promoters: number;
    neutrals: number;
    detractors: number;
  };
  sentiment_distribution: Array<{ sentiment: string; count: number }>;
  top_topics: Array<{ topic: string; frequency: number }>;
  regional_breakdown: Array<{ region: string; count: number; avg_nps?: number | null }>;
}

export interface InterviewSummary {
  interview_id: string;
  campaign_id: string;
  campaign_name: string;
  respondent_id: string;
  respondent_name: string;
  region?: string | null;
  city?: string | null;
  state?: string | null;
  channel: string;
  status: string;
  completed_at?: string | null;
  nps_score?: number | null;
  nps_class?: 'promoter' | 'neutral' | 'detractor' | null;
  sentiment?: 'positive' | 'neutral' | 'negative' | 'mixed' | 'unknown' | null;
  topics_json?: string[] | null;
  summary_text?: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
}
