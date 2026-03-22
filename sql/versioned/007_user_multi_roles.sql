-- 007: Multi-role support — user can have multiple roles per tenant
-- ================================================================

-- 1. Junction table for user-tenant-role
CREATE TABLE IF NOT EXISTS core.user_tenant_role (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES core.app_user(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES core.tenant(id),
  role TEXT NOT NULL CHECK (role IN ('platform_admin','tenant_admin','campaign_manager','analyst','interviewer')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, tenant_id, role)
);

CREATE INDEX IF NOT EXISTS ix_user_tenant_role_user ON core.user_tenant_role(user_id);
CREATE INDEX IF NOT EXISTS ix_user_tenant_role_tenant ON core.user_tenant_role(tenant_id);

-- 2. Migrate existing roles: insert one row per user from app_user.role
INSERT INTO core.user_tenant_role (user_id, tenant_id, role)
SELECT id, tenant_id, role
FROM core.app_user
WHERE role IS NOT NULL
ON CONFLICT DO NOTHING;
