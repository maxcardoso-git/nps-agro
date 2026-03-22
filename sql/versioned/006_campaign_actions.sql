-- 006: Campaign Actions — introduce action layer between campaign and questionnaire
-- ==================================================================================

-- 1. Campaign Action table
CREATE TABLE IF NOT EXISTS core.campaign_action (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenant(id),
  campaign_id UUID NOT NULL REFERENCES core.campaign(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NULL,
  questionnaire_version_id UUID NOT NULL REFERENCES core.questionnaire_version(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','completed')),
  start_date DATE NULL,
  end_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_campaign_action_campaign ON core.campaign_action(campaign_id);
CREATE INDEX IF NOT EXISTS ix_campaign_action_tenant ON core.campaign_action(tenant_id);

-- 2. Action-Interviewer many-to-many
CREATE TABLE IF NOT EXISTS core.action_interviewer (
  action_id UUID NOT NULL REFERENCES core.campaign_action(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES core.app_user(id),
  PRIMARY KEY (action_id, user_id)
);

-- 3. Add action_id to respondent, interview, contact_attempt
ALTER TABLE core.respondent ADD COLUMN IF NOT EXISTS action_id UUID NULL REFERENCES core.campaign_action(id);
ALTER TABLE core.interview ADD COLUMN IF NOT EXISTS action_id UUID NULL REFERENCES core.campaign_action(id);
ALTER TABLE core.contact_attempt ADD COLUMN IF NOT EXISTS action_id UUID NULL REFERENCES core.campaign_action(id);

CREATE INDEX IF NOT EXISTS ix_respondent_action ON core.respondent(action_id);
CREATE INDEX IF NOT EXISTS ix_interview_action ON core.interview(action_id);
CREATE INDEX IF NOT EXISTS ix_contact_attempt_action ON core.contact_attempt(action_id);

-- 4. Data migration: create a default action for each campaign that has a questionnaire_version_id
INSERT INTO core.campaign_action (tenant_id, campaign_id, name, questionnaire_version_id, status, start_date, end_date)
SELECT c.tenant_id, c.id, c.name || ' - Ação Padrão', c.questionnaire_version_id, c.status, c.start_date, c.end_date
FROM core.campaign c
WHERE c.questionnaire_version_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM core.campaign_action ca WHERE ca.campaign_id = c.id
  );

-- 5. Link existing respondents to their campaign's default action
UPDATE core.respondent r
SET action_id = ca.id
FROM core.campaign_action ca
WHERE ca.campaign_id = r.campaign_id
  AND r.action_id IS NULL;

-- 6. Link existing interviews to their campaign's default action
UPDATE core.interview i
SET action_id = ca.id
FROM core.campaign_action ca
WHERE ca.campaign_id = i.campaign_id
  AND i.action_id IS NULL;

-- 7. Link existing contact_attempts to their campaign's default action
UPDATE core.contact_attempt ct
SET action_id = ca.id
FROM core.campaign_action ca
WHERE ca.campaign_id = ct.campaign_id
  AND ct.action_id IS NULL;

-- 8. Make campaign.questionnaire_version_id nullable (no longer required directly)
ALTER TABLE core.campaign ALTER COLUMN questionnaire_version_id DROP NOT NULL;
