-- 013: Add persona/cluster/BU/GT fields to campaign_action
-- ========================================================

ALTER TABLE core.campaign_action ADD COLUMN IF NOT EXISTS tipo_persona TEXT;
ALTER TABLE core.campaign_action ADD COLUMN IF NOT EXISTS cluster TEXT;
ALTER TABLE core.campaign_action ADD COLUMN IF NOT EXISTS bu TEXT;
ALTER TABLE core.campaign_action ADD COLUMN IF NOT EXISTS gt TEXT;
