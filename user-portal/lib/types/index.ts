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
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  segment?: string | null;
  start_date?: string | null;
  end_date?: string | null;
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
