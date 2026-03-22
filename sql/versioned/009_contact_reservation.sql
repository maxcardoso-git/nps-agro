-- 009: Contact reservation system for queue management
-- ====================================================

-- Add reservation fields to respondent
ALTER TABLE core.respondent
  ADD COLUMN IF NOT EXISTS reserved_by UUID NULL REFERENCES core.app_user(id),
  ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS ix_respondent_reserved ON core.respondent(reserved_by) WHERE reserved_by IS NOT NULL;
