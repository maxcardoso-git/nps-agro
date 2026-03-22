-- 008: Fill PRD data model gaps
-- ================================

-- 1. Add segment to respondent (cooperativa, revenda, produtor, venda_direta, kam)
ALTER TABLE core.respondent ADD COLUMN IF NOT EXISTS segment TEXT NULL;
CREATE INDEX IF NOT EXISTS ix_respondent_segment ON core.respondent(segment);

-- 2. Add missing fields to enrichment
ALTER TABLE core.enrichment ADD COLUMN IF NOT EXISTS keywords_json JSONB NULL;
ALTER TABLE core.enrichment ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(5,4) NULL;

-- 3. Create ai schema and view alias
CREATE SCHEMA IF NOT EXISTS ai;

-- Create ai.enrichment as a view pointing to core.enrichment (PRD wants ai schema)
CREATE OR REPLACE VIEW ai.enrichment AS
SELECT * FROM core.enrichment;

-- 4. Analytics view: NPS by segment
CREATE OR REPLACE VIEW analytics.vw_nps_by_segment AS
SELECT
  r.segment,
  e.campaign_id,
  COUNT(*) AS total_interviews,
  COUNT(*) FILTER (WHERE e.nps_class = 'promoter') AS promoters,
  COUNT(*) FILTER (WHERE e.nps_class = 'neutral') AS neutrals,
  COUNT(*) FILTER (WHERE e.nps_class = 'detractor') AS detractors,
  ROUND(
    (COUNT(*) FILTER (WHERE e.nps_class = 'promoter')::numeric
     - COUNT(*) FILTER (WHERE e.nps_class = 'detractor')::numeric)
    / NULLIF(COUNT(*), 0) * 100, 1
  ) AS nps_score
FROM core.enrichment e
JOIN core.interview i ON i.id = e.interview_id
JOIN core.respondent r ON r.id = i.respondent_id
WHERE r.segment IS NOT NULL
GROUP BY r.segment, e.campaign_id;

-- 5. Analytics view: NPS by region (useful for regional breakdown)
CREATE OR REPLACE VIEW analytics.vw_nps_by_region AS
SELECT
  r.region,
  r.state,
  e.campaign_id,
  COUNT(*) AS total_interviews,
  ROUND(
    (COUNT(*) FILTER (WHERE e.nps_class = 'promoter')::numeric
     - COUNT(*) FILTER (WHERE e.nps_class = 'detractor')::numeric)
    / NULLIF(COUNT(*), 0) * 100, 1
  ) AS nps_score
FROM core.enrichment e
JOIN core.interview i ON i.id = e.interview_id
JOIN core.respondent r ON r.id = i.respondent_id
WHERE r.region IS NOT NULL
GROUP BY r.region, r.state, e.campaign_id;

-- 6. Analytics view: NPS by account (useful for KAM analysis)
CREATE OR REPLACE VIEW analytics.vw_nps_by_account AS
SELECT
  a.id AS account_id,
  a.name AS account_name,
  e.campaign_id,
  COUNT(*) AS total_interviews,
  ROUND(
    (COUNT(*) FILTER (WHERE e.nps_class = 'promoter')::numeric
     - COUNT(*) FILTER (WHERE e.nps_class = 'detractor')::numeric)
    / NULLIF(COUNT(*), 0) * 100, 1
  ) AS nps_score
FROM core.enrichment e
JOIN core.interview i ON i.id = e.interview_id
JOIN core.respondent r ON r.id = i.respondent_id
JOIN core.account a ON a.id = r.account_id
GROUP BY a.id, a.name, e.campaign_id;
