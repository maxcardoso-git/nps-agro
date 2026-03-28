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

export interface TenantSettings {
  branding?: TenantBranding;
  [key: string]: unknown;
}

export interface Tenant {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive' | 'suspended';
  timezone: string;
  settings_json: TenantSettings;
  created_at?: string;
  updated_at?: string;
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
  questionnaire_version_id: string;
  channel_config_json?: Record<string, unknown>;
  created_at?: string;
}

export interface Questionnaire {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  status: 'draft' | 'published' | 'archived';
  created_at?: string;
  updated_at?: string;
}

export interface QuestionnaireVersion {
  id: string;
  questionnaire_id: string;
  version_number: number;
  status: 'draft' | 'published' | 'archived';
  schema_json: QuestionnaireSchema;
  published_at?: string | null;
}

export interface DisplayCondition {
  question_id: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'gte' | 'lte' | 'gt' | 'lt';
  value: unknown;
}

export interface QuestionScale {
  min: number;
  max: number;
}

export interface Question {
  id: string;
  label: string;
  type: 'nps' | 'scale' | 'single_choice' | 'multi_choice' | 'text' | 'number' | 'boolean';
  required: boolean;
  options?: string[];
  scale?: QuestionScale;
  display_condition?: DisplayCondition;
}

export interface QuestionnaireSchema {
  meta?: {
    name?: string;
    segment?: string;
    version?: number;
    ai_instructions?: string;
  };
  questions: Question[];
}

export interface InterviewSummary {
  interview_id: string;
  tenant_id: string;
  tenant_name: string;
  campaign_id: string;
  campaign_name: string;
  segment?: string;
  respondent_id: string;
  respondent_name: string;
  region?: string;
  city?: string;
  state?: string;
  channel: string;
  status: string;
  started_at?: string | null;
  completed_at?: string | null;
  nps_score?: number | null;
  nps_class?: 'promoter' | 'neutral' | 'detractor' | null;
  sentiment?: 'positive' | 'neutral' | 'negative' | 'mixed' | 'unknown' | null;
  topics_json?: string[];
  summary_text?: string | null;
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

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
}

export interface ReportFilters {
  region?: string;
  sentiment?: string;
  nps_class?: string;
  page?: number;
  page_size?: number;
}

export interface TenantUser {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Resource {
  id: string;
  tenant_id: string;
  name: string;
  type: 'api_http' | 'database' | 'mcp_server' | 'llm' | 'queue' | 'storage' | 'custom';
  subtype: string | null;
  endpoint_url: string | null;
  http_method: string;
  auth_mode: 'none' | 'bearer' | 'api_key' | 'basic' | 'oauth2' | 'custom';
  auth_config: Record<string, unknown>;
  connection_json: Record<string, unknown>;
  config_json: Record<string, unknown>;
  metadata_json: Record<string, unknown>;
  tags: string[];
  environment: 'production' | 'staging' | 'development';
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LlmResource {
  id: string;
  tenant_id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'azure' | 'ollama' | 'custom';
  model_id: string;
  api_key?: string | null;
  base_url?: string | null;
  purpose: 'general' | 'enrichment' | 'chat' | 'embeddings' | 'transcription';
  config_json: Record<string, unknown>;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StartInterviewRequest {
  tenant_id: string;
  campaign_id: string;
  respondent_id: string;
}

export interface StartInterviewResponse {
  interview_id: string;
  next_question: Question | null;
  interview_state: {
    completed: boolean;
    progress: number;
  };
}

export interface AnswerQuestionRequest {
  question_id: string;
  value: unknown;
}

export interface AnswerQuestionResponse {
  interview_state: {
    completed: boolean;
    progress: number;
  };
}

export interface NextQuestionResponse {
  next_question: Question | null;
  interview_state: {
    completed: boolean;
    progress: number;
  };
}
