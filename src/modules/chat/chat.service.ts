import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database.service';

const FUNCTIONS = [
  {
    name: 'get_nps_summary',
    description: 'Retorna resumo NPS: score geral, promotores, neutros, detratores, sentimento, tópicos. Use para perguntas sobre NPS, satisfação geral, distribuição.',
    parameters: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string', description: 'ID da campanha (opcional)' },
      },
    },
  },
  {
    name: 'search_interviews',
    description: 'Busca entrevistas por filtros. Use para encontrar entrevistas por região, sentimento, NPS, segmento ou texto.',
    parameters: {
      type: 'object',
      properties: {
        region: { type: 'string', description: 'Filtrar por região' },
        sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral', 'mixed'] },
        nps_class: { type: 'string', enum: ['promoter', 'neutral', 'detractor'] },
        segment: { type: 'string', description: 'Segmento (cooperativa, revenda, kam, oto, venda_direta)' },
        query: { type: 'string', description: 'Busca textual no nome, resumo ou tópicos' },
        limit: { type: 'number', description: 'Máximo de resultados (default 10)' },
      },
    },
  },
  {
    name: 'search_topics',
    description: 'Retorna tópicos/temas mais mencionados nas entrevistas com frequência. Use para perguntas sobre temas, assuntos recorrentes, do que falam.',
    parameters: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string' },
        nps_class: { type: 'string', enum: ['promoter', 'neutral', 'detractor'], description: 'Filtrar tópicos por classe NPS' },
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'get_detractor_insights',
    description: 'Análise dos detratores: lista, drivers negativos, regiões afetadas. Use para perguntas sobre insatisfação, problemas, reclamações.',
    parameters: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string' },
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'get_nps_by_segment',
    description: 'NPS quebrado por segmento de negócio. Use para comparações entre segmentos.',
    parameters: {
      type: 'object',
      properties: { campaign_id: { type: 'string' } },
    },
  },
  {
    name: 'get_nps_by_region',
    description: 'NPS quebrado por região geográfica. Use para análises regionais.',
    parameters: {
      type: 'object',
      properties: { campaign_id: { type: 'string' } },
    },
  },
  {
    name: 'get_adherence_stats',
    description: 'Estatísticas de aderência ao roteiro do questionário. Mede qualidade das entrevistas.',
    parameters: {
      type: 'object',
      properties: { campaign_id: { type: 'string' } },
    },
  },
];

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly db: DatabaseService) {}

  async chat(tenantId: string, message: string, history: Array<{ role: string; content: string }>) {
    // Get LLM config
    const llmRow = await this.db.query<{ provider: string; model_id: string; api_key: string }>(
      `SELECT provider, model_id, api_key FROM ai.llm_resource WHERE tenant_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1`,
      [tenantId],
    );
    const llm = llmRow.rows[0];
    if (!llm?.api_key) return { reply: 'Nenhum modelo de IA configurado. Configure um LLM resource no admin.' };

    // Get context about campaigns
    const campaignsRow = await this.db.query<{ name: string; id: string; segment: string }>(
      `SELECT id, name, segment FROM core.campaign WHERE tenant_id = $1 AND status = 'active'`, [tenantId],
    );
    const campaignContext = campaignsRow.rows.map((c) => `- ${c.name} (${c.segment || 'sem segmento'}, id: ${c.id})`).join('\n');

    const systemPrompt = `Você é um assistente de análise NPS para o agronegócio brasileiro (Syngenta). Responda em português.

Campanhas ativas:
${campaignContext}

Você tem acesso a funções para consultar dados reais. SEMPRE use as funções para buscar dados antes de responder. Nunca invente números.
Quando o usuário perguntar sobre NPS, temas, detratores, regiões ou segmentos, chame a função apropriada.
Formate respostas com números claros e insights acionáveis.`;

    // Build messages
    const messages = [
      { role: 'user', parts: [{ text: systemPrompt + '\n\nPergunta do usuário: ' + message }] },
    ];

    // Call Gemini with function declarations
    const baseUrl = llm.provider === 'google'
      ? 'https://generativelanguage.googleapis.com/v1beta'
      : 'https://api.openai.com/v1/chat';

    if (llm.provider === 'google') {
      return this.chatWithGemini(llm, messages, tenantId);
    }

    return { reply: 'Apenas Gemini é suportado para chat no momento.' };
  }

  private async chatWithGemini(
    llm: { model_id: string; api_key: string },
    messages: Array<{ role: string; parts: Array<{ text: string }> }>,
    tenantId: string,
  ) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${llm.model_id}:generateContent?key=${llm.api_key}`;

    // First call with function declarations
    const body = {
      contents: messages,
      tools: [{
        functionDeclarations: FUNCTIONS.map((f) => ({
          name: f.name,
          description: f.description,
          parameters: f.parameters,
        })),
      }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`CHAT_ERROR ${res.status}: ${err}`);
      return { reply: 'Erro ao consultar a IA. Tente novamente.' };
    }

    const data = await res.json() as Record<string, unknown>;
    const candidates = data.candidates as Array<{ content: { parts: Array<{ text?: string; functionCall?: { name: string; args: Record<string, unknown> } }> } }>;
    const parts = candidates?.[0]?.content?.parts || [];

    // Check if function call
    const functionCall = parts.find((p) => p.functionCall);
    if (functionCall?.functionCall) {
      const { name, args } = functionCall.functionCall;
      this.logger.log(`CHAT_FUNCTION_CALL name=${name} args=${JSON.stringify(args)}`);

      // Execute function
      const result = await this.executeFunction(name, args, tenantId);

      // Second call with function result
      const followUp = {
        contents: [
          ...messages,
          { role: 'model', parts: [{ functionCall: { name, args } }] },
          { role: 'function', parts: [{ functionResponse: { name, response: { result } } }] },
        ],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
      };

      const res2 = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(followUp),
      });

      if (!res2.ok) return { reply: 'Erro ao processar resposta da IA.' };

      const data2 = await res2.json() as Record<string, unknown>;
      const candidates2 = data2.candidates as Array<{ content: { parts: Array<{ text?: string }> } }>;
      const reply = candidates2?.[0]?.content?.parts?.[0]?.text || 'Sem resposta.';

      return { reply, function_called: name, function_args: args };
    }

    // Direct text response
    const textPart = parts.find((p) => p.text);
    return { reply: textPart?.text || 'Sem resposta.' };
  }

  private async executeFunction(name: string, args: Record<string, unknown>, tenantId: string): Promise<unknown> {
    switch (name) {
      case 'get_nps_summary': {
        const campaignFilter = args.campaign_id ? `AND e.campaign_id = '${args.campaign_id}'` : '';
        const nps = await this.db.query(
          `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE nps_class='promoter') AS promoters,
           COUNT(*) FILTER (WHERE nps_class='neutral') AS neutrals, COUNT(*) FILTER (WHERE nps_class='detractor') AS detractors,
           ROUND((COUNT(*) FILTER (WHERE nps_class='promoter')::numeric - COUNT(*) FILTER (WHERE nps_class='detractor')::numeric) / NULLIF(COUNT(*),0) * 100, 1) AS nps_score,
           ROUND(AVG(nps_score), 1) AS avg_nps_raw
           FROM core.enrichment e WHERE e.tenant_id = $1 ${campaignFilter}`, [tenantId],
        );
        const sentiment = await this.db.query(
          `SELECT sentiment, COUNT(*) AS count FROM core.enrichment e WHERE e.tenant_id = $1 ${campaignFilter} GROUP BY sentiment`, [tenantId],
        );
        const topics = await this.db.query(
          `SELECT topic, COUNT(*) AS frequency FROM core.enrichment e, jsonb_array_elements_text(e.topics_json) AS topic WHERE e.tenant_id = $1 ${campaignFilter} AND e.topics_json IS NOT NULL GROUP BY topic ORDER BY frequency DESC LIMIT 10`, [tenantId],
        );
        return { ...nps.rows[0], sentiment: sentiment.rows, top_topics: topics.rows };
      }

      case 'search_interviews': {
        const where = ['v.tenant_id = $1'];
        const params: unknown[] = [tenantId];
        if (args.region) { params.push(`%${args.region}%`); where.push(`v.region ILIKE $${params.length}`); }
        if (args.sentiment) { params.push(args.sentiment); where.push(`v.sentiment = $${params.length}`); }
        if (args.nps_class) { params.push(args.nps_class); where.push(`v.nps_class = $${params.length}`); }
        if (args.segment) { params.push(args.segment); where.push(`v.segment = $${params.length}`); }
        if (args.query) { params.push(`%${args.query}%`); const i = params.length; where.push(`(v.respondent_name ILIKE $${i} OR v.summary_text ILIKE $${i})`); }
        const limit = Math.min(Number(args.limit) || 10, 20);
        params.push(limit);
        const result = await this.db.query(
          `SELECT v.respondent_name, v.region, v.nps_score, v.nps_class, v.sentiment, v.summary_text, v.segment
           FROM analytics.vw_interview_summary v WHERE ${where.join(' AND ')} ORDER BY v.completed_at DESC NULLS LAST LIMIT $${params.length}`, params,
        );
        return { total: result.rows.length, interviews: result.rows };
      }

      case 'search_topics': {
        const where = ['e.tenant_id = $1'];
        const params: unknown[] = [tenantId];
        if (args.campaign_id) { params.push(args.campaign_id); where.push(`e.campaign_id = $${params.length}`); }
        if (args.nps_class) { params.push(args.nps_class); where.push(`e.nps_class = $${params.length}`); }
        const limit = Math.min(Number(args.limit) || 15, 30);
        params.push(limit);
        const result = await this.db.query(
          `SELECT topic, COUNT(*) AS frequency FROM core.enrichment e, jsonb_array_elements_text(e.topics_json) AS topic WHERE ${where.join(' AND ')} AND e.topics_json IS NOT NULL GROUP BY topic ORDER BY frequency DESC LIMIT $${params.length}`, params,
        );
        return { topics: result.rows };
      }

      case 'get_detractor_insights': {
        const campaignFilter = args.campaign_id ? `AND e.campaign_id = '${args.campaign_id}'` : '';
        const detractors = await this.db.query(
          `SELECT v.respondent_name, v.region, v.nps_score, v.summary_text, v.segment
           FROM analytics.vw_interview_summary v JOIN core.enrichment e ON e.interview_id = v.interview_id
           WHERE v.tenant_id = $1 AND e.nps_class = 'detractor' ${campaignFilter} ORDER BY v.completed_at DESC LIMIT ${Number(args.limit) || 10}`, [tenantId],
        );
        const drivers = await this.db.query(
          `SELECT driver, COUNT(*) AS frequency FROM core.enrichment e, jsonb_array_elements_text(e.driver_negative_json) AS driver
           WHERE e.tenant_id = $1 AND e.nps_class = 'detractor' ${campaignFilter} AND e.driver_negative_json IS NOT NULL GROUP BY driver ORDER BY frequency DESC LIMIT 10`, [tenantId],
        );
        return { detractors: detractors.rows, negative_drivers: drivers.rows };
      }

      case 'get_nps_by_segment': {
        const campaignFilter = args.campaign_id ? `AND campaign_id = '${args.campaign_id}'` : '';
        const result = await this.db.query(
          `SELECT segment, total_interviews, nps_score FROM analytics.vw_nps_by_segment WHERE segment IS NOT NULL ${campaignFilter} ORDER BY total_interviews DESC`, [],
        );
        return result.rows;
      }

      case 'get_nps_by_region': {
        const campaignFilter = args.campaign_id ? `AND campaign_id = '${args.campaign_id}'` : '';
        const result = await this.db.query(
          `SELECT region, state, total_interviews, nps_score FROM analytics.vw_nps_by_region WHERE region IS NOT NULL ${campaignFilter} ORDER BY total_interviews DESC LIMIT 15`, [],
        );
        return result.rows;
      }

      case 'get_adherence_stats': {
        const campaignFilter = args.campaign_id ? `AND aa.campaign_id = '${args.campaign_id}'` : '';
        const result = await this.db.query(
          `SELECT ROUND(AVG(aa.adherence_score)::numeric, 1) AS avg_adherence, COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE aa.adherence_score >= 80)::int AS high,
           COUNT(*) FILTER (WHERE aa.adherence_score < 60)::int AS low
           FROM core.audio_asset aa WHERE aa.tenant_id = $1 AND aa.adherence_score IS NOT NULL ${campaignFilter}`, [tenantId],
        );
        return result.rows[0];
      }

      default:
        return { error: `Unknown function: ${name}` };
    }
  }
}
