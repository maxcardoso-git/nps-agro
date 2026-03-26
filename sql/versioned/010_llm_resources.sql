-- 010: LLM resource registry for AI features
-- =============================================

-- Table to store LLM provider configurations (models, API keys, endpoints)
CREATE TABLE IF NOT EXISTS ai.llm_resource (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES core.tenant(id),
  name        TEXT NOT NULL,
  provider    TEXT NOT NULL,           -- openai, anthropic, google, azure, ollama, custom
  model_id    TEXT NOT NULL,           -- gpt-4o, claude-sonnet-4-20250514, gemini-2.5-pro, etc.
  api_key     TEXT,                    -- encrypted API key (nullable for shared/default configs)
  base_url    TEXT,                    -- custom endpoint URL (nullable for default provider URLs)
  purpose     TEXT NOT NULL DEFAULT 'general', -- general, enrichment, chat, embeddings, transcription
  config_json JSONB NOT NULL DEFAULT '{}',     -- temperature, max_tokens, system_prompt, etc.
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_llm_resource_tenant ON ai.llm_resource(tenant_id);
CREATE INDEX IF NOT EXISTS ix_llm_resource_active ON ai.llm_resource(tenant_id, is_active) WHERE is_active = true;

COMMENT ON TABLE ai.llm_resource IS 'Registry of LLM models/providers available for AI features per tenant';
COMMENT ON COLUMN ai.llm_resource.provider IS 'LLM provider: openai, anthropic, google, azure, ollama, custom';
COMMENT ON COLUMN ai.llm_resource.model_id IS 'Provider model identifier, e.g. gpt-4o, claude-sonnet-4-20250514';
COMMENT ON COLUMN ai.llm_resource.purpose IS 'Intended use: general, enrichment, chat, embeddings, transcription';
