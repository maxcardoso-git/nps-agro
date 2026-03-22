-- 005: Add accounts table, extend respondent, add contact attempts
-- ================================================================

-- 1. Account (Conta) — company/organization that respondents belong to
CREATE TABLE IF NOT EXISTS core.account (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenant(id),
  name TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS ix_account_tenant ON core.account(tenant_id);

-- 2. Extend respondent with account reference + new columns
ALTER TABLE core.respondent
  ADD COLUMN IF NOT EXISTS account_id UUID NULL REFERENCES core.account(id),
  ADD COLUMN IF NOT EXISTS job_title TEXT NULL,
  ADD COLUMN IF NOT EXISTS persona_type TEXT NULL;

CREATE INDEX IF NOT EXISTS ix_respondent_account ON core.respondent(account_id);

-- 3. Contact attempt — tracks each call/contact try by interviewer
CREATE TABLE IF NOT EXISTS core.contact_attempt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenant(id),
  campaign_id UUID NOT NULL REFERENCES core.campaign(id),
  respondent_id UUID NOT NULL REFERENCES core.respondent(id),
  interviewer_user_id UUID NOT NULL REFERENCES core.app_user(id),
  outcome TEXT NOT NULL CHECK (outcome IN ('success','no_answer','wrong_number','busy','scheduled','refused')),
  notes TEXT NULL,
  interview_id UUID NULL REFERENCES core.interview(id),
  scheduled_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_contact_attempt_campaign_respondent ON core.contact_attempt(campaign_id, respondent_id);
CREATE INDEX IF NOT EXISTS ix_contact_attempt_interviewer_scheduled ON core.contact_attempt(interviewer_user_id, scheduled_at) WHERE scheduled_at IS NOT NULL;
