-- 014: Audio batch processing — automatic audio file ingestion from folders
-- ============================================================================

-- Configuration for batch audio processing
CREATE TABLE IF NOT EXISTS core.audio_batch_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES core.tenant(id),
  campaign_id     UUID NOT NULL REFERENCES core.campaign(id),
  action_id       UUID NOT NULL REFERENCES core.campaign_action(id),
  name            TEXT NOT NULL,
  source_path     TEXT NOT NULL,                    -- /mnt/audios/revendas/
  file_pattern    TEXT NOT NULL DEFAULT '*.mp4',    -- glob pattern
  code_regex      TEXT NOT NULL DEFAULT '(\w+)',    -- regex to extract respondent code from filename
  schedule_cron   TEXT DEFAULT '*/30 * * * *',      -- cron expression
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_run_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_audio_batch_config_tenant ON core.audio_batch_config(tenant_id);

-- Individual file tracking for batch processing
CREATE TABLE IF NOT EXISTS core.audio_batch_file (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id       UUID NOT NULL REFERENCES core.audio_batch_config(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  file_path       TEXT NOT NULL,
  respondent_code TEXT,
  respondent_id   UUID REFERENCES core.respondent(id),
  interview_id    UUID REFERENCES core.interview(id),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','completed','failed','skipped')),
  error_message   TEXT,
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (config_id, file_name)
);

CREATE INDEX IF NOT EXISTS ix_audio_batch_file_config ON core.audio_batch_file(config_id, status);
