-- Seed: Questionários NPS Syngenta (5 segmentos)
-- Tenant: usar o tenant existente
-- ================================================

DO $$
DECLARE
  v_tenant_id UUID;
  v_q_id UUID;
  v_v_id UUID;
BEGIN
  -- Resolve tenant (pega o primeiro ativo)
  SELECT id INTO v_tenant_id FROM core.tenant WHERE status = 'active' ORDER BY created_at LIMIT 1;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum tenant ativo encontrado';
  END IF;

  -- ═══════════════════════════════════════════════════════════════════
  -- 1. VENDA DIRETA
  -- ═══════════════════════════════════════════════════════════════════
  INSERT INTO core.questionnaire (id, tenant_id, name, description, status)
  VALUES (gen_random_uuid(), v_tenant_id, 'NPS Venda Direta', 'Questionário NPS para segmento Venda Direta - Syngenta', 'published')
  RETURNING id INTO v_q_id;

  INSERT INTO core.questionnaire_version (id, questionnaire_id, version_number, status, schema_json, published_at)
  VALUES (gen_random_uuid(), v_q_id, 1, 'published', '{
    "meta": { "name": "NPS Venda Direta", "segment": "venda_direta", "version": 1 },
    "questions": [
      { "id": "nome_contato", "label": "Nome completo informado por quem atendeu", "type": "text", "required": true },
      { "id": "nps_score", "label": "Qual é a chance de você recomendar a Syngenta para um amigo ou colega, em uma escala de 0 a 10?", "type": "nps", "required": true },
      { "id": "motivo_nota", "label": "Poderia nos contar o motivo de sua nota? Pode ser um elogio, crítica ou sugestão.", "type": "text", "required": true },
      { "id": "facilidade_negocios", "label": "Como você avalia fazer negócios com a Syngenta?", "type": "single_choice", "required": true, "options": ["Difícil", "Nem Fácil nem Difícil", "Fácil"] },
      { "id": "dificuldade_negocios", "label": "O que dificulta fazer negócios com a Syngenta?", "type": "text", "required": false, "display_condition": { "question_id": "facilidade_negocios", "operator": "equals", "value": "Difícil" } },
      { "id": "fazer_melhor", "label": "O que a Syngenta precisa fazer melhor?", "type": "text", "required": false },
      { "id": "fazer_diferente", "label": "O que a Syngenta poderia fazer diferente?", "type": "text", "required": false },
      { "id": "faz_bem", "label": "O que a Syngenta faz muito bem?", "type": "text", "required": false },
      { "id": "papel_negocio", "label": "Qual mais representa o seu papel no negócio?", "type": "single_choice", "required": true, "options": ["Proprietário/Sócio", "Sucessor", "Responsável técnico", "Cônjuge", "Outro"] }
    ]
  }'::jsonb, NOW());

  -- ═══════════════════════════════════════════════════════════════════
  -- 2. REVENDAS
  -- ═══════════════════════════════════════════════════════════════════
  INSERT INTO core.questionnaire (id, tenant_id, name, description, status)
  VALUES (gen_random_uuid(), v_tenant_id, 'NPS Revendas', 'Questionário NPS para segmento Revendas - Syngenta', 'published')
  RETURNING id INTO v_q_id;

  INSERT INTO core.questionnaire_version (id, questionnaire_id, version_number, status, schema_json, published_at)
  VALUES (gen_random_uuid(), v_q_id, 1, 'published', '{
    "meta": { "name": "NPS Revendas", "segment": "revenda", "version": 1 },
    "questions": [
      { "id": "nome_contato", "label": "Nome completo informado por quem atendeu", "type": "text", "required": true },
      { "id": "funcao_revenda", "label": "Função na revenda", "type": "text", "required": false },
      { "id": "nps_score", "label": "Qual é a chance de você recomendar a Syngenta para um amigo ou colega, em uma escala de 0 a 10?", "type": "nps", "required": true },
      { "id": "motivo_nota", "label": "Poderia nos contar o motivo de sua nota?", "type": "text", "required": true },
      { "id": "facilidade_negocios", "label": "Como você avalia fazer negócios com a Syngenta?", "type": "single_choice", "required": true, "options": ["Difícil", "Nem Fácil nem Difícil", "Fácil"] },
      { "id": "dificuldade_negocios", "label": "O que dificulta fazer negócios com a Syngenta?", "type": "text", "required": false, "display_condition": { "question_id": "facilidade_negocios", "operator": "in", "value": ["Difícil"] } },
      { "id": "satisfacao_comercial", "label": "Qual o seu nível de satisfação em relação ao atendimento do time comercial (RTV, gerente regional, AT)?", "type": "scale", "required": true, "scale": { "min": 1, "max": 5 } },
      { "id": "motivo_atendimento", "label": "Nos diga o motivo da sua nota sobre o atendimento, caso queira.", "type": "text", "required": false, "display_condition": { "question_id": "satisfacao_comercial", "operator": "lte", "value": 2 } },
      { "id": "presenca_rtv_lojas", "label": "Como você avalia a presença do RTV nas lojas da revenda? (1-Muito insatisfeito a 5-Muito satisfeito)", "type": "scale", "required": false, "scale": { "min": 1, "max": 5 } },
      { "id": "presenca_rtv_agricultores", "label": "Como você avalia a presença do RTV nos agricultores? (1-Muito insatisfeito a 5-Muito satisfeito)", "type": "scale", "required": false, "scale": { "min": 1, "max": 5 } },
      { "id": "confianca_adesao", "label": "Quanto você se sente confiante em relação à entrega da sua adesão do ano de 2025 com a Syngenta?", "type": "single_choice", "required": true, "options": ["Nada confiante", "Pouco confiante", "Confiante", "Muito confiante"] },
      { "id": "motivo_confianca", "label": "Poderia nos contar o(s) motivo(s)?", "type": "text", "required": false, "display_condition": { "question_id": "confianca_adesao", "operator": "in", "value": ["Nada confiante", "Pouco confiante"] } },
      { "id": "reciprocidade_5_10_anos", "label": "Qual o seu nível de confiança em manter sua reciprocidade com a Syngenta pelos próximos 5 a 10 anos?", "type": "single_choice", "required": false, "options": ["Alto", "Médio", "Baixo"] },
      { "id": "motivo_reciprocidade", "label": "Poderia nos contar o(s) motivo(s)?", "type": "text", "required": false, "display_condition": { "question_id": "reciprocidade_5_10_anos", "operator": "in", "value": ["Médio", "Baixo"] } },
      { "id": "concorrente_principal", "label": "Qual fornecedor de defensivo agrícola que é seu principal concorrente hoje?", "type": "single_choice", "required": false, "options": ["Bayer", "Corteva", "UPL", "BASF", "Adama", "Ihara", "FMC", "Rainbow", "Outro"] },
      { "id": "comentario_concorrente", "label": "Comentário sobre o concorrente acima assinalado (opcional)", "type": "text", "required": false },
      { "id": "fazer_melhor", "label": "O que a Syngenta precisa fazer melhor?", "type": "text", "required": false },
      { "id": "fazer_diferente", "label": "O que a Syngenta poderia fazer diferente?", "type": "text", "required": false },
      { "id": "faz_bem", "label": "O que a Syngenta faz muito bem?", "type": "text", "required": false },
      { "id": "nivel_gestao", "label": "Em que nível de gestão você atua na sua empresa?", "type": "single_choice", "required": false, "options": ["Conselho", "Presidência / CEO", "Diretoria", "Gerência", "Coordenação", "Outro"] },
      { "id": "area_atuacao", "label": "Em que área você atua na sua empresa?", "type": "multi_choice", "required": false, "options": ["Compras", "Comercial (insumos)", "Comercialização de grãos", "Finanças", "Recursos Humanos", "Todas", "Outro"] },
      { "id": "meio_comunicacao", "label": "Como prefere receber informações/ser contatado?", "type": "single_choice", "required": false, "options": ["E-mail", "Whatsapp", "Ligação telefônica", "Através do representante de vendas", "Outro"] }
    ]
  }'::jsonb, NOW());

  -- ═══════════════════════════════════════════════════════════════════
  -- 3. OTO
  -- ═══════════════════════════════════════════════════════════════════
  INSERT INTO core.questionnaire (id, tenant_id, name, description, status)
  VALUES (gen_random_uuid(), v_tenant_id, 'NPS OTO', 'Questionário NPS para segmento OTO - Syngenta', 'published')
  RETURNING id INTO v_q_id;

  INSERT INTO core.questionnaire_version (id, questionnaire_id, version_number, status, schema_json, published_at)
  VALUES (gen_random_uuid(), v_q_id, 1, 'published', '{
    "meta": { "name": "NPS OTO", "segment": "oto", "version": 1 },
    "questions": [
      { "id": "nome_contato", "label": "Nome completo informado por quem atendeu", "type": "text", "required": true },
      { "id": "nps_score", "label": "Qual é a chance de você recomendar a Syngenta para um amigo ou colega, em uma escala de 0 a 10?", "type": "nps", "required": true },
      { "id": "motivo_nota", "label": "Poderia nos contar o motivo de sua nota?", "type": "text", "required": true },
      { "id": "facilidade_negocios", "label": "Como você avalia fazer negócios com a Syngenta?", "type": "single_choice", "required": true, "options": ["Difícil", "Nem Fácil nem Difícil", "Fácil"] },
      { "id": "dificuldade_negocios", "label": "O que dificulta fazer negócios com a Syngenta?", "type": "text", "required": false, "display_condition": { "question_id": "facilidade_negocios", "operator": "equals", "value": "Difícil" } },
      { "id": "fazer_melhor", "label": "O que a Syngenta precisa fazer melhor?", "type": "text", "required": false },
      { "id": "fazer_diferente", "label": "O que a Syngenta poderia fazer diferente?", "type": "text", "required": false },
      { "id": "faz_bem", "label": "O que a Syngenta faz muito bem?", "type": "text", "required": false },
      { "id": "papel_negocio", "label": "Qual mais representa o seu papel no negócio?", "type": "single_choice", "required": true, "options": ["Proprietário/Sócio", "Sucessor", "Responsável técnico", "Cônjuge", "Outro"] },
      { "id": "tempo_cliente_oto", "label": "Há quanto tempo você é cliente OTO? (em anos)", "type": "number", "required": false },
      { "id": "frequencia_whatsapp", "label": "Com que frequência você utiliza seu WhatsApp?", "type": "single_choice", "required": false, "options": ["1 vez por dia", "1 vez a cada 2 dias", "1 vez por semana", "Quase nunca", "Não utilizo o WhatsApp"] },
      { "id": "satisfacao_mensagens_syngenta", "label": "Você está satisfeito com o número de mensagens que recebe da Syngenta por WhatsApp?", "type": "single_choice", "required": false, "options": ["Não estou satisfeito porque recebo comunicações demais", "Não estou satisfeito porque gostaria de receber mais comunicações", "Nunca recebi nenhuma mensagem da Syngenta", "Estou satisfeito", "Outro"] },
      { "id": "mensagens_concorrencia", "label": "Você recebe mensagens no WhatsApp de alguma outra empresa de defensivos?", "type": "single_choice", "required": false, "options": ["Sim, recebo mensagens das empresas", "Não recebo mensagem de nenhuma empresa", "Recebo mensagem somente da Syngenta", "Outro"] },
      { "id": "comentarios_whatsapp", "label": "Comentários sobre o uso do WhatsApp, frequência de mensagens da Syngenta e da concorrência.", "type": "text", "required": false }
    ]
  }'::jsonb, NOW());

  -- ═══════════════════════════════════════════════════════════════════
  -- 4. KAM
  -- ═══════════════════════════════════════════════════════════════════
  INSERT INTO core.questionnaire (id, tenant_id, name, description, status)
  VALUES (gen_random_uuid(), v_tenant_id, 'NPS KAM', 'Questionário NPS para segmento KAM (Key Account Management) - Syngenta', 'published')
  RETURNING id INTO v_q_id;

  INSERT INTO core.questionnaire_version (id, questionnaire_id, version_number, status, schema_json, published_at)
  VALUES (gen_random_uuid(), v_q_id, 1, 'published', '{
    "meta": { "name": "NPS KAM", "segment": "kam", "version": 1 },
    "questions": [
      { "id": "nome_contato", "label": "Nome completo informado por quem atendeu", "type": "text", "required": true },
      { "id": "nps_score", "label": "Qual é a chance de você recomendar a Syngenta para um amigo ou colega, em uma escala de 0 a 10?", "type": "nps", "required": true },
      { "id": "motivo_nota", "label": "Poderia nos contar o motivo de sua nota?", "type": "text", "required": true },
      { "id": "facilidade_negocios", "label": "Como você avalia fazer negócios com a Syngenta?", "type": "single_choice", "required": true, "options": ["Difícil", "Nem Fácil nem Difícil", "Fácil"] },
      { "id": "dificuldade_negocios", "label": "O que dificulta fazer negócios com a Syngenta?", "type": "text", "required": false, "display_condition": { "question_id": "facilidade_negocios", "operator": "equals", "value": "Difícil" } },
      { "id": "satisfacao_comercial", "label": "Qual o seu nível de satisfação em relação ao atendimento do time comercial (RTV, gerente regional, AT)?", "type": "scale", "required": true, "scale": { "min": 1, "max": 5 } },
      { "id": "motivo_atendimento_comercial", "label": "Nos diga o motivo da sua nota sobre o atendimento comercial, caso queira.", "type": "text", "required": false },
      { "id": "satisfacao_tecnico", "label": "Qual o seu nível de satisfação em relação ao atendimento do time técnico (gerente técnico, DTM)?", "type": "scale", "required": true, "scale": { "min": 1, "max": 5 } },
      { "id": "motivo_atendimento_tecnico", "label": "Nos diga o motivo da sua nota sobre o atendimento técnico, caso queira.", "type": "text", "required": false },
      { "id": "fazer_melhor", "label": "O que a Syngenta precisa fazer melhor?", "type": "text", "required": false },
      { "id": "fazer_diferente", "label": "O que a Syngenta poderia fazer diferente?", "type": "text", "required": false },
      { "id": "faz_bem", "label": "O que a Syngenta faz muito bem?", "type": "text", "required": false },
      { "id": "papel_negocio", "label": "Qual mais representa o seu papel no negócio?", "type": "single_choice", "required": true, "options": ["Proprietário/Sócio", "Sucessor", "Responsável técnico", "Cônjuge", "Diretoria", "Comprador", "Suprimentos", "Outro"] }
    ]
  }'::jsonb, NOW());

  -- ═══════════════════════════════════════════════════════════════════
  -- 5. COOPERATIVA
  -- ═══════════════════════════════════════════════════════════════════
  INSERT INTO core.questionnaire (id, tenant_id, name, description, status)
  VALUES (gen_random_uuid(), v_tenant_id, 'NPS Cooperativa', 'Questionário NPS para segmento Cooperativa - Syngenta', 'published')
  RETURNING id INTO v_q_id;

  INSERT INTO core.questionnaire_version (id, questionnaire_id, version_number, status, schema_json, published_at)
  VALUES (gen_random_uuid(), v_q_id, 1, 'published', '{
    "meta": { "name": "NPS Cooperativa", "segment": "cooperativa", "version": 1 },
    "questions": [
      { "id": "nome_contato", "label": "Nome completo informado por quem atendeu", "type": "text", "required": true },
      { "id": "funcao_cooperativa", "label": "Função na cooperativa", "type": "text", "required": false },
      { "id": "nps_score", "label": "Qual é a chance de você recomendar a Syngenta para um amigo ou colega, em uma escala de 0 a 10?", "type": "nps", "required": true },
      { "id": "motivo_nota", "label": "Poderia nos contar o motivo de sua nota?", "type": "text", "required": true },
      { "id": "facilidade_negocios", "label": "Como você avalia fazer negócios com a Syngenta?", "type": "single_choice", "required": true, "options": ["Difícil", "Nem Fácil nem Difícil", "Fácil"] },
      { "id": "dificuldade_negocios", "label": "O que dificulta fazer negócios com a Syngenta?", "type": "text", "required": false, "display_condition": { "question_id": "facilidade_negocios", "operator": "equals", "value": "Difícil" } },
      { "id": "satisfacao_comercial", "label": "Qual o seu nível de satisfação em relação ao atendimento do time comercial (RTV, gerente regional, AT)?", "type": "scale", "required": false, "scale": { "min": 1, "max": 5 } },
      { "id": "motivo_atendimento", "label": "Nos diga o motivo da sua nota sobre o atendimento, caso queira.", "type": "text", "required": false, "display_condition": { "question_id": "satisfacao_comercial", "operator": "lte", "value": 2 } },
      { "id": "presenca_rtv_entrepostos", "label": "Como você avalia a presença do RTV nos entrepostos da cooperativa? (1-Muito insatisfeito a 5-Muito satisfeito)", "type": "scale", "required": false, "scale": { "min": 1, "max": 5 } },
      { "id": "presenca_rtv_agricultores", "label": "Como você avalia a presença do RTV nos agricultores? (1-Muito insatisfeito a 5-Muito satisfeito)", "type": "scale", "required": false, "scale": { "min": 1, "max": 5 } },
      { "id": "satisfacao_lideranca", "label": "Qual o seu nível de satisfação em relação à proximidade e interações com a liderança sênior da Syngenta?", "type": "single_choice", "required": false, "options": ["Gostaria de ter mais interações", "Estou satisfeito", "Considero excessivo o número de interações"] },
      { "id": "aumentar_negocios", "label": "O que a Syngenta poderia fazer para aumentar os negócios com a sua cooperativa?", "type": "text", "required": false },
      { "id": "fazer_melhor", "label": "O que a Syngenta precisa fazer melhor?", "type": "text", "required": false },
      { "id": "fazer_diferente", "label": "O que a Syngenta poderia fazer diferente?", "type": "text", "required": false },
      { "id": "faz_bem", "label": "O que a Syngenta faz muito bem?", "type": "text", "required": false },
      { "id": "nivel_gestao", "label": "Em que nível de gestão você atua na sua empresa?", "type": "single_choice", "required": false, "options": ["Conselho", "Presidência / CEO", "Diretoria", "Gerência", "Coordenação", "Outro"] },
      { "id": "area_atuacao", "label": "Em que área você atua na sua empresa?", "type": "multi_choice", "required": false, "options": ["Compras", "Comercial (insumos)", "Comercialização de grãos", "Finanças", "Recursos Humanos", "Todas", "Outro"] },
      { "id": "meio_comunicacao", "label": "Como prefere receber informações/ser contatado?", "type": "single_choice", "required": false, "options": ["E-mail", "Whatsapp", "SMS", "Ligação telefônica", "Através do representante de vendas", "Outro"] }
    ]
  }'::jsonb, NOW());

  RAISE NOTICE 'Criados 5 questionários para tenant %', v_tenant_id;
END $$;
