INSERT INTO core.tenant (id, name, code, status, timezone, settings_json)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Syngenta', 'SYNGENTA', 'active', 'America/Sao_Paulo', '{"features":{"manual_collection":true,"voice_upload":true}}'::jsonb),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cliente Demo Agro', 'CLIENTE_DEMO_AGRO', 'active', 'America/Sao_Paulo', '{"features":{"manual_collection":true}}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO core.app_user (id, tenant_id, name, email, role, is_active)
VALUES
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Max', 'max@syngenta.com', 'admin', TRUE),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Dimitri', 'dimitri@syngenta.com', 'interviewer', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO core.questionnaire (id, tenant_id, name, description, status, created_by)
VALUES
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'NPS Revendas', 'Questionário para campanha de revendas', 'published', '22222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;

INSERT INTO core.questionnaire_version (id, questionnaire_id, version_number, status, schema_json, published_at, created_by)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  '33333333-3333-3333-3333-333333333333',
  1,
  'published',
  '{
    "meta":{"name":"NPS Revendas","segment":"Revendas","version":1},
    "questions":[
      {"id":"nps","label":"Qual é a chance de você recomendar a Syngenta para um amigo ou colega?","type":"nps","required":true,"scale":{"min":0,"max":10}},
      {"id":"nps_reason","label":"Poderia nos contar o motivo de sua nota?","type":"text","required":false},
      {"id":"ease_business","label":"Como você avalia fazer negócios com a Syngenta?","type":"single_choice","required":true,"options":["muito_facil","facil","nem_facil_nem_dificil","dificil","extremamente_dificil"]},
      {"id":"difficulty_reason","label":"O que dificulta fazer negócios com a Syngenta?","type":"text","required":false,"display_condition":{"question_id":"ease_business","operator":"in","value":["dificil","extremamente_dificil"]}},
      {"id":"service_satisfaction","label":"Qual seu nível de satisfação com o atendimento do time comercial?","type":"scale","required":true,"scale":{"min":1,"max":5}},
      {"id":"service_satisfaction_reason","label":"Nos diga o motivo da sua nota sobre o atendimento","type":"text","required":false,"display_condition":{"question_id":"service_satisfaction","operator":"lte","value":2}}
    ]
  }'::jsonb,
  NOW(),
  '22222222-2222-2222-2222-222222222222'
)
ON CONFLICT DO NOTHING;

INSERT INTO core.campaign (id, tenant_id, name, description, status, segment, start_date, end_date, questionnaire_version_id, channel_config_json, created_by)
VALUES
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Campanha Revendas 2026', 'Campanha principal de NPS para revendas', 'active', 'Revendas', '2026-03-01', '2026-06-30', '44444444-4444-4444-4444-444444444444', '{"channels":["manual","voice_upload"],"allow_audio":true}'::jsonb, '22222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;

INSERT INTO core.respondent (id, tenant_id, campaign_id, external_id, name, phone, email, region, city, state, metadata_json)
VALUES
  ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'BASE-001', 'João Silva', '11999999999', 'joao.silva@email.com', 'Sudeste', 'Ribeirão Preto', 'SP', '{"management_level":"Diretoria","business_area":"Comercial","preferred_contact":"WhatsApp"}'::jsonb),
  ('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'BASE-002', 'Maria Souza', '11988888888', 'maria.souza@email.com', 'Sudeste', 'Uberlândia', 'MG', '{"management_level":"Compras","business_area":"Suprimentos","preferred_contact":"Telefone"}'::jsonb),
  ('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'BASE-003', 'Carlos Oliveira', '11977777777', 'carlos.oliveira@email.com', 'Centro-Oeste', 'Rio Verde', 'GO', '{"management_level":"Proprietário","business_area":"Operações","preferred_contact":"Telefone"}'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO core.interview (id, tenant_id, campaign_id, questionnaire_version_id, respondent_id, channel, status, interviewer_user_id, started_at, completed_at, raw_payload_json)
VALUES
  ('99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', '66666666-6666-6666-6666-666666666666', 'manual', 'completed', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NOW() - INTERVAL '10 day', NOW() - INTERVAL '10 day' + INTERVAL '12 minute', '{"source":"manual_form","batch":"MVP-SEED"}'::jsonb),
  ('aaaaaaaa-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', '77777777-7777-7777-7777-777777777777', 'manual', 'completed', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NOW() - INTERVAL '9 day', NOW() - INTERVAL '9 day' + INTERVAL '14 minute', '{"source":"manual_form","batch":"MVP-SEED"}'::jsonb),
  ('bbbbbbbb-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', '88888888-8888-8888-8888-888888888888', 'voice_upload', 'review_pending', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NOW() - INTERVAL '8 day', NULL, '{"source":"audio_upload","batch":"MVP-SEED"}'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO core.answer (tenant_id, campaign_id, interview_id, questionnaire_version_id, question_id, answer_type, value_numeric, raw_json)
VALUES
  ('11111111-1111-1111-1111-111111111111','55555555-5555-5555-5555-555555555555','99999999-9999-9999-9999-999999999999','44444444-4444-4444-4444-444444444444','nps','nps',9,'{"value":9}'::jsonb),
  ('11111111-1111-1111-1111-111111111111','55555555-5555-5555-5555-555555555555','99999999-9999-9999-9999-999999999999','44444444-4444-4444-4444-444444444444','service_satisfaction','scale',5,'{"value":5}'::jsonb),
  ('11111111-1111-1111-1111-111111111111','55555555-5555-5555-5555-555555555555','aaaaaaaa-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444','nps','nps',4,'{"value":4}'::jsonb),
  ('11111111-1111-1111-1111-111111111111','55555555-5555-5555-5555-555555555555','aaaaaaaa-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444','service_satisfaction','scale',2,'{"value":2}'::jsonb),
  ('11111111-1111-1111-1111-111111111111','55555555-5555-5555-5555-555555555555','bbbbbbbb-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444','nps','nps',8,'{"source":"voice","value":8}'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO core.answer (tenant_id, campaign_id, interview_id, questionnaire_version_id, question_id, answer_type, value_text, raw_json)
VALUES
  ('11111111-1111-1111-1111-111111111111','55555555-5555-5555-5555-555555555555','99999999-9999-9999-9999-999999999999','44444444-4444-4444-4444-444444444444','nps_reason','text','Atendimento muito bom e presença forte do time comercial.','{"value":"Atendimento muito bom e presença forte do time comercial."}'::jsonb),
  ('11111111-1111-1111-1111-111111111111','55555555-5555-5555-5555-555555555555','99999999-9999-9999-9999-999999999999','44444444-4444-4444-4444-444444444444','ease_business','single_choice','facil','{"value":"facil"}'::jsonb),
  ('11111111-1111-1111-1111-111111111111','55555555-5555-5555-5555-555555555555','aaaaaaaa-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444','nps_reason','text','Demora na entrega e dificuldade de contato.','{"value":"Demora na entrega e dificuldade de contato."}'::jsonb),
  ('11111111-1111-1111-1111-111111111111','55555555-5555-5555-5555-555555555555','aaaaaaaa-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444','ease_business','single_choice','dificil','{"value":"dificil"}'::jsonb),
  ('11111111-1111-1111-1111-111111111111','55555555-5555-5555-5555-555555555555','aaaaaaaa-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444','difficulty_reason','text','Logística ruim e atrasos recorrentes.','{"value":"Logística ruim e atrasos recorrentes."}'::jsonb),
  ('11111111-1111-1111-1111-111111111111','55555555-5555-5555-5555-555555555555','aaaaaaaa-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444','service_satisfaction_reason','text','Baixa frequência de retorno e demora no suporte.','{"value":"Baixa frequência de retorno e demora no suporte."}'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO core.answer (tenant_id, campaign_id, interview_id, questionnaire_version_id, question_id, answer_type, value_numeric, raw_json, confidence_score)
VALUES
  ('11111111-1111-1111-1111-111111111111','55555555-5555-5555-5555-555555555555','bbbbbbbb-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444','nps','nps',8,'{"source":"voice","value":8}'::jsonb,0.8700)
ON CONFLICT DO NOTHING;

INSERT INTO core.answer (tenant_id, campaign_id, interview_id, questionnaire_version_id, question_id, answer_type, value_text, raw_json, confidence_score)
VALUES
  ('11111111-1111-1111-1111-111111111111','55555555-5555-5555-5555-555555555555','bbbbbbbb-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444','nps_reason','text','Produto é bom, mas pode melhorar velocidade de atendimento.','{"source":"voice","value":"Produto é bom, mas pode melhorar velocidade de atendimento."}'::jsonb,0.7900)
ON CONFLICT DO NOTHING;

INSERT INTO core.audio_asset (id, tenant_id, campaign_id, interview_id, file_name, file_url, mime_type, duration_seconds, transcription_text, transcription_confidence, processed)
VALUES
  ('cccccccc-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'bbbbbbbb-1111-1111-1111-111111111111', 'Carlos_Oliveira_2026_03_12.mp3', 's3://bucket/carlos_oliveira_20260312.mp3', 'audio/mpeg', 382, 'Entrevistado informa nota 8, elogia produto e menciona necessidade de melhorar velocidade de atendimento.', 0.9100, FALSE)
ON CONFLICT DO NOTHING;

INSERT INTO core.enrichment (tenant_id, campaign_id, interview_id, nps_score, nps_class, sentiment, topics_json, summary_text, driver_positive_json, driver_negative_json, enrichment_model)
VALUES
  ('11111111-1111-1111-1111-111111111111','55555555-5555-5555-5555-555555555555','99999999-9999-9999-9999-999999999999',9,'promoter','positive','["atendimento","presenca_comercial"]'::jsonb,'Cliente promotor com destaque positivo para o atendimento e proximidade comercial.','["atendimento","presenca_comercial"]'::jsonb,'[]'::jsonb,'rules_v1'),
  ('11111111-1111-1111-1111-111111111111','55555555-5555-5555-5555-555555555555','aaaaaaaa-1111-1111-1111-111111111111',4,'detractor','negative','["logistica","tempo_resposta","suporte"]'::jsonb,'Cliente detrator devido a atrasos na entrega e dificuldade de contato com o time.','[]'::jsonb,'["logistica","tempo_resposta","suporte"]'::jsonb,'rules_v1'),
  ('11111111-1111-1111-1111-111111111111','55555555-5555-5555-5555-555555555555','bbbbbbbb-1111-1111-1111-111111111111',8,'neutral','mixed','["produto","velocidade_atendimento"]'::jsonb,'Cliente neutro, percebe qualidade no produto mas espera melhora no tempo de atendimento.','["produto"]'::jsonb,'["velocidade_atendimento"]'::jsonb,'rules_v1')
ON CONFLICT DO NOTHING;

INSERT INTO core.processing_job (tenant_id, campaign_id, interview_id, job_type, status, payload_json, result_json, started_at, finished_at)
VALUES
  ('11111111-1111-1111-1111-111111111111','55555555-5555-5555-5555-555555555555','bbbbbbbb-1111-1111-1111-111111111111','audio_transcription','completed','{"audio_asset_id":"cccccccc-1111-1111-1111-111111111111"}'::jsonb,'{"transcription_confidence":0.91}'::jsonb,NOW()-INTERVAL '8 day',NOW()-INTERVAL '8 day' + INTERVAL '3 minute')
ON CONFLICT DO NOTHING;
