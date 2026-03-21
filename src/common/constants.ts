export const DB_POOL = Symbol('DB_POOL');

export const TENANT_STATUSES = ['active', 'inactive', 'suspended'] as const;
export const CAMPAIGN_STATUSES = ['draft', 'active', 'paused', 'completed', 'archived'] as const;
export const QUESTIONNAIRE_STATUSES = ['draft', 'published', 'archived'] as const;

export type PlatformRole =
  | 'platform_admin'
  | 'tenant_admin'
  | 'campaign_manager'
  | 'analyst'
  | 'interviewer';
