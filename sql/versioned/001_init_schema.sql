CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS analytics;

CREATE TABLE IF NOT EXISTS core.tenant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.app_user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenant(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS core.questionnaire (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenant(id),
  name TEXT NOT NULL,
  description TEXT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID NULL REFERENCES core.app_user(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.questionnaire_version (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID NOT NULL REFERENCES core.questionnaire(id),
  version_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  schema_json JSONB NOT NULL,
  published_at TIMESTAMP NULL,
  created_by UUID NULL REFERENCES core.app_user(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (questionnaire_id, version_number)
);

CREATE TABLE IF NOT EXISTS core.campaign (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenant(id),
  name TEXT NOT NULL,
  description TEXT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  segment TEXT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  questionnaire_version_id UUID NOT NULL REFERENCES core.questionnaire_version(id),
  channel_config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NULL REFERENCES core.app_user(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.respondent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenant(id),
  campaign_id UUID NOT NULL REFERENCES core.campaign(id),
  external_id TEXT NULL,
  name TEXT NOT NULL,
  phone TEXT NULL,
  email TEXT NULL,
  region TEXT NULL,
  city TEXT NULL,
  state TEXT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.interview (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenant(id),
  campaign_id UUID NOT NULL REFERENCES core.campaign(id),
  questionnaire_version_id UUID NOT NULL REFERENCES core.questionnaire_version(id),
  respondent_id UUID NOT NULL REFERENCES core.respondent(id),
  channel TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'not_started',
  interviewer_user_id UUID NULL REFERENCES core.app_user(id),
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  raw_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.answer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenant(id),
  campaign_id UUID NOT NULL REFERENCES core.campaign(id),
  interview_id UUID NOT NULL REFERENCES core.interview(id),
  questionnaire_version_id UUID NOT NULL REFERENCES core.questionnaire_version(id),
  question_id TEXT NOT NULL,
  answer_type TEXT NOT NULL,
  value_numeric NUMERIC NULL,
  value_text TEXT NULL,
  value_boolean BOOLEAN NULL,
  value_json JSONB NULL,
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence_score NUMERIC(5,4) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (interview_id, question_id)
);

CREATE TABLE IF NOT EXISTS core.audio_asset (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenant(id),
  campaign_id UUID NOT NULL REFERENCES core.campaign(id),
  interview_id UUID NOT NULL REFERENCES core.interview(id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  mime_type TEXT NULL,
  duration_seconds INTEGER NULL,
  transcription_text TEXT NULL,
  transcription_confidence NUMERIC(5,4) NULL,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.enrichment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenant(id),
  campaign_id UUID NOT NULL REFERENCES core.campaign(id),
  interview_id UUID NOT NULL REFERENCES core.interview(id),
  nps_score INTEGER NULL,
  nps_class TEXT NULL,
  sentiment TEXT NOT NULL DEFAULT 'unknown',
  topics_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary_text TEXT NULL,
  driver_positive_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  driver_negative_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  enrichment_model TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (interview_id)
);

CREATE TABLE IF NOT EXISTS core.processing_job (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core.tenant(id),
  campaign_id UUID NULL REFERENCES core.campaign(id),
  interview_id UUID NULL REFERENCES core.interview(id),
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT NULL,
  started_at TIMESTAMP NULL,
  finished_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
