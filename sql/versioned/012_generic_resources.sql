-- 012: Generic resource registry (APIs, databases, MCP servers, LLMs)
-- ===================================================================

CREATE TABLE IF NOT EXISTS core.resource (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES core.tenant(id),
  name            TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('api_http','database','mcp_server','llm','queue','storage','custom')),
  subtype         TEXT,                                    -- optional categorization
  endpoint_url    TEXT,                                    -- URL or connection string
  http_method     TEXT DEFAULT 'POST' CHECK (http_method IN ('GET','POST','PUT','PATCH','DELETE')),
  auth_mode       TEXT DEFAULT 'none' CHECK (auth_mode IN ('none','bearer','api_key','basic','oauth2','custom')),
  auth_config     JSONB NOT NULL DEFAULT '{}',             -- token, api_key, credentials (encrypted)
  connection_json JSONB NOT NULL DEFAULT '{}',             -- baseUrl, timeout, retries, etc.
  config_json     JSONB NOT NULL DEFAULT '{}',             -- resource-specific configuration
  metadata_json   JSONB NOT NULL DEFAULT '{}',             -- version, provider, description, etc.
  tags            TEXT[] DEFAULT '{}',                     -- searchable tags
  environment     TEXT NOT NULL DEFAULT 'production' CHECK (environment IN ('production','staging','development')),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_resource_tenant  ON core.resource(tenant_id);
CREATE INDEX IF NOT EXISTS ix_resource_type    ON core.resource(tenant_id, type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS ix_resource_tags    ON core.resource USING GIN(tags);

COMMENT ON TABLE core.resource IS 'Generic registry of external resources (APIs, databases, MCP servers, LLMs)';
