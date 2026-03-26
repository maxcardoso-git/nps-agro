-- 011: Execution engine — contact lifecycle + quality review
-- ==========================================================

-- 1. Contact execution — lifecycle of contacting a respondent
CREATE TABLE IF NOT EXISTS core.contact_execution (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES core.tenant(id),
  campaign_id     UUID NOT NULL REFERENCES core.campaign(id),
  action_id       UUID REFERENCES core.campaign_action(id),
  respondent_id   UUID NOT NULL REFERENCES core.respondent(id),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','in_progress','completed','exhausted')),
  max_attempts    INTEGER NOT NULL DEFAULT 3,
  attempt_count   INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  priority        INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, respondent_id)
);

CREATE INDEX IF NOT EXISTS ix_contact_exec_tenant     ON core.contact_execution(tenant_id);
CREATE INDEX IF NOT EXISTS ix_contact_exec_queue      ON core.contact_execution(campaign_id, status, next_attempt_at)
  WHERE status IN ('pending','in_progress');
CREATE INDEX IF NOT EXISTS ix_contact_exec_action     ON core.contact_execution(action_id) WHERE action_id IS NOT NULL;

-- 2. Link contact_attempt to execution cycle
ALTER TABLE core.contact_attempt ADD COLUMN IF NOT EXISTS contact_execution_id UUID REFERENCES core.contact_execution(id);
ALTER TABLE core.contact_attempt ADD COLUMN IF NOT EXISTS attempt_number INTEGER;
ALTER TABLE core.contact_attempt ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'phone';
ALTER TABLE core.contact_attempt ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE core.contact_attempt ADD COLUMN IF NOT EXISTS audio_id UUID REFERENCES core.audio_asset(id);

-- 3. Contact outcome — consolidated final result
CREATE TABLE IF NOT EXISTS core.contact_outcome (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_execution_id  UUID NOT NULL UNIQUE REFERENCES core.contact_execution(id),
  final_status          TEXT NOT NULL CHECK (final_status IN ('completed','refused','invalid','unreachable')),
  interview_id          UUID REFERENCES core.interview(id),
  reason                TEXT,
  closed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Quality review — QA workflow for interview validation
CREATE TABLE IF NOT EXISTS core.quality_review (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES core.tenant(id),
  interview_id    UUID NOT NULL REFERENCES core.interview(id),
  review_status   TEXT NOT NULL DEFAULT 'pending'
                    CHECK (review_status IN ('pending','approved','rejected')),
  reviewer_id     UUID REFERENCES core.app_user(id),
  score           NUMERIC(3,1),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_quality_review_tenant   ON core.quality_review(tenant_id);
CREATE INDEX IF NOT EXISTS ix_quality_review_pending  ON core.quality_review(tenant_id, review_status)
  WHERE review_status = 'pending';
CREATE INDEX IF NOT EXISTS ix_quality_review_interview ON core.quality_review(interview_id);

-- 5. Execution analytics view
CREATE OR REPLACE VIEW analytics.vw_execution_stats AS
SELECT
  ce.tenant_id,
  ce.campaign_id,
  ce.action_id,
  COUNT(*) AS total_contacts,
  COUNT(*) FILTER (WHERE ce.status = 'pending') AS pending,
  COUNT(*) FILTER (WHERE ce.status = 'in_progress') AS in_progress,
  COUNT(*) FILTER (WHERE ce.status = 'completed') AS completed,
  COUNT(*) FILTER (WHERE ce.status = 'exhausted') AS exhausted,
  ROUND(
    COUNT(*) FILTER (WHERE ce.status = 'completed')::numeric
    / NULLIF(COUNT(*), 0) * 100, 1
  ) AS completion_rate,
  ROUND(AVG(ce.attempt_count) FILTER (WHERE ce.status = 'completed'), 1) AS avg_attempts_to_complete
FROM core.contact_execution ce
GROUP BY ce.tenant_id, ce.campaign_id, ce.action_id;

-- 6. Quality review analytics view
CREATE OR REPLACE VIEW analytics.vw_quality_stats AS
SELECT
  qr.tenant_id,
  i.campaign_id,
  COUNT(*) AS total_reviews,
  COUNT(*) FILTER (WHERE qr.review_status = 'approved') AS approved,
  COUNT(*) FILTER (WHERE qr.review_status = 'rejected') AS rejected,
  COUNT(*) FILTER (WHERE qr.review_status = 'pending') AS pending,
  ROUND(AVG(qr.score), 1) AS avg_score,
  ROUND(
    COUNT(*) FILTER (WHERE qr.review_status = 'rejected')::numeric
    / NULLIF(COUNT(*) FILTER (WHERE qr.review_status != 'pending'), 0) * 100, 1
  ) AS rejection_rate
FROM core.quality_review qr
JOIN core.interview i ON i.id = qr.interview_id
GROUP BY qr.tenant_id, i.campaign_id;
