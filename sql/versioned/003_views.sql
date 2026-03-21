CREATE OR REPLACE VIEW analytics.vw_interview_summary AS
SELECT
  i.id AS interview_id,
  i.tenant_id,
  t.name AS tenant_name,
  i.campaign_id,
  c.name AS campaign_name,
  c.segment,
  i.respondent_id,
  r.name AS respondent_name,
  r.region,
  r.city,
  r.state,
  i.channel,
  i.status,
  i.started_at,
  i.completed_at,
  e.nps_score,
  e.nps_class,
  e.sentiment,
  e.topics_json,
  e.summary_text
FROM core.interview i
JOIN core.tenant t ON t.id = i.tenant_id
JOIN core.campaign c ON c.id = i.campaign_id
JOIN core.respondent r ON r.id = i.respondent_id
LEFT JOIN core.enrichment e ON e.interview_id = i.id;

CREATE OR REPLACE VIEW analytics.vw_nps_by_campaign AS
SELECT
  campaign_id,
  COUNT(*) AS total_interviews,
  COUNT(*) FILTER (WHERE nps_class = 'promoter') AS promoters,
  COUNT(*) FILTER (WHERE nps_class = 'neutral') AS neutrals,
  COUNT(*) FILTER (WHERE nps_class = 'detractor') AS detractors,
  ROUND(
    (
      (COUNT(*) FILTER (WHERE nps_class = 'promoter') * 100.0 / NULLIF(COUNT(*), 0))
      - (COUNT(*) FILTER (WHERE nps_class = 'detractor') * 100.0 / NULLIF(COUNT(*), 0))
    )::numeric,
    2
  ) AS nps
FROM core.enrichment
GROUP BY campaign_id;

CREATE OR REPLACE VIEW analytics.vw_topic_frequency AS
SELECT
  e.tenant_id,
  e.campaign_id,
  topic.value::text AS topic,
  COUNT(*) AS frequency
FROM core.enrichment e,
LATERAL jsonb_array_elements_text(e.topics_json) AS topic(value)
GROUP BY e.tenant_id, e.campaign_id, topic.value;
