SELECT COUNT(*) AS tenants_total FROM core.tenant;
SELECT COUNT(*) AS campaigns_total FROM core.campaign;
SELECT COUNT(*) AS interviews_total FROM core.interview;
SELECT COUNT(*) AS answers_total FROM core.answer;
SELECT COUNT(*) AS enrichments_total FROM core.enrichment;

SELECT
  campaign_id,
  total_interviews,
  promoters,
  neutrals,
  detractors,
  nps
FROM analytics.vw_nps_by_campaign
ORDER BY campaign_id;
