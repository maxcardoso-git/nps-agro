import { z } from 'zod';
import { query, queryOne } from './db.js';

// ─── Tool: search_interviews ─────────────────────────────────────────────────
export const searchInterviewsSchema = {
  name: 'search_interviews',
  description:
    'Pesquisa entrevistas NPS com filtros por texto, região, sentimento, classificação NPS, segmento e campanha. ' +
    'Retorna resumo de cada entrevista incluindo respondente, NPS, sentimento, tópicos e summary.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      tenant_id: { type: 'string', description: 'ID do tenant (obrigatório)' },
      query: { type: 'string', description: 'Texto livre para buscar no nome, resumo ou tópicos' },
      campaign_id: { type: 'string', description: 'Filtrar por campanha específica' },
      region: { type: 'string', description: 'Filtrar por região' },
      state: { type: 'string', description: 'Filtrar por UF (estado)' },
      segment: { type: 'string', description: 'Filtrar por segmento (cooperativa, revenda, produtor, venda_direta, kam)' },
      sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral', 'mixed'], description: 'Filtrar por sentimento' },
      nps_class: { type: 'string', enum: ['promoter', 'neutral', 'detractor'], description: 'Filtrar por classificação NPS' },
      limit: { type: 'number', description: 'Máximo de resultados (padrão: 20, máximo: 100)' },
    },
    required: ['tenant_id'],
  },
};

const SearchInterviewsInput = z.object({
  tenant_id: z.string().uuid(),
  query: z.string().optional(),
  campaign_id: z.string().uuid().optional(),
  region: z.string().optional(),
  state: z.string().optional(),
  segment: z.string().optional(),
  sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']).optional(),
  nps_class: z.enum(['promoter', 'neutral', 'detractor']).optional(),
  limit: z.number().min(1).max(100).optional(),
});

export async function searchInterviews(args: unknown) {
  const input = SearchInterviewsInput.parse(args);
  const where: string[] = ['v.tenant_id = $1'];
  const params: unknown[] = [input.tenant_id];

  if (input.campaign_id) {
    params.push(input.campaign_id);
    where.push(`v.campaign_id = $${params.length}`);
  }
  if (input.region) {
    params.push(`%${input.region}%`);
    where.push(`v.region ILIKE $${params.length}`);
  }
  if (input.state) {
    params.push(input.state);
    where.push(`v.state = $${params.length}`);
  }
  if (input.segment) {
    params.push(input.segment);
    where.push(`v.segment = $${params.length}`);
  }
  if (input.sentiment) {
    params.push(input.sentiment);
    where.push(`v.sentiment = $${params.length}`);
  }
  if (input.nps_class) {
    params.push(input.nps_class);
    where.push(`v.nps_class = $${params.length}`);
  }
  if (input.query) {
    params.push(`%${input.query}%`);
    const idx = params.length;
    where.push(
      `(v.respondent_name ILIKE $${idx} OR v.summary_text ILIKE $${idx} OR v.topics_json::text ILIKE $${idx})`,
    );
  }

  const limit = Math.min(input.limit || 20, 100);
  params.push(limit);

  const rows = await query(
    `
    SELECT
      v.interview_id, v.campaign_name, v.respondent_name,
      v.region, v.state, v.segment,
      v.nps_score, v.nps_class, v.sentiment,
      v.topics_json, v.summary_text,
      v.completed_at
    FROM analytics.vw_interview_summary v
    WHERE ${where.join(' AND ')}
    ORDER BY v.completed_at DESC NULLS LAST
    LIMIT $${params.length}
    `,
    params,
  );

  return {
    total: rows.length,
    interviews: rows,
  };
}

// ─── Tool: get_interview_detail ──────────────────────────────────────────────
export const getInterviewDetailSchema = {
  name: 'get_interview_detail',
  description:
    'Retorna detalhes completos de uma entrevista específica, incluindo respostas individuais, ' +
    'drivers positivos/negativos, keywords e dados do respondente.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      tenant_id: { type: 'string', description: 'ID do tenant' },
      interview_id: { type: 'string', description: 'ID da entrevista' },
    },
    required: ['tenant_id', 'interview_id'],
  },
};

const GetInterviewDetailInput = z.object({
  tenant_id: z.string().uuid(),
  interview_id: z.string().uuid(),
});

export async function getInterviewDetail(args: unknown) {
  const input = GetInterviewDetailInput.parse(args);

  const interview = await queryOne(
    `
    SELECT
      v.interview_id, v.campaign_id, v.campaign_name, v.segment,
      v.respondent_id, v.respondent_name, v.region, v.city, v.state,
      v.channel, v.status, v.started_at, v.completed_at,
      v.nps_score, v.nps_class, v.sentiment,
      v.topics_json, v.summary_text
    FROM analytics.vw_interview_summary v
    WHERE v.interview_id = $1 AND v.tenant_id = $2
    `,
    [input.interview_id, input.tenant_id],
  );

  if (!interview) return { error: 'Entrevista não encontrada' };

  const enrichment = await queryOne(
    `
    SELECT
      driver_positive_json, driver_negative_json,
      keywords_json, confidence_score, enrichment_model
    FROM core.enrichment
    WHERE interview_id = $1 AND tenant_id = $2
    `,
    [input.interview_id, input.tenant_id],
  );

  const answers = await query(
    `
    SELECT question_id, answer_type, value_numeric, value_text, value_boolean
    FROM core.answer
    WHERE interview_id = $1
    ORDER BY created_at
    `,
    [input.interview_id],
  );

  return {
    ...interview,
    drivers_positive: enrichment?.driver_positive_json ?? [],
    drivers_negative: enrichment?.driver_negative_json ?? [],
    keywords: enrichment?.keywords_json ?? [],
    confidence: enrichment?.confidence_score,
    model: enrichment?.enrichment_model,
    answers,
  };
}

// ─── Tool: get_nps_summary ──────────────────────────────────────────────────
export const getNpsSummarySchema = {
  name: 'get_nps_summary',
  description:
    'Retorna resumo estatístico do NPS: score geral, distribuição (promotores, neutros, detratores), ' +
    'quebra por segmento, região e top contas. Ideal para perguntas como "Qual o NPS geral?" ou "Como está o NPS por região?".',
  inputSchema: {
    type: 'object' as const,
    properties: {
      tenant_id: { type: 'string', description: 'ID do tenant (obrigatório)' },
      campaign_id: { type: 'string', description: 'Filtrar por campanha (opcional)' },
    },
    required: ['tenant_id'],
  },
};

const GetNpsSummaryInput = z.object({
  tenant_id: z.string().uuid(),
  campaign_id: z.string().uuid().optional(),
});

export async function getNpsSummary(args: unknown) {
  const input = GetNpsSummaryInput.parse(args);

  const campaignFilter = input.campaign_id ? 'AND campaign_id = $2' : '';
  const params: unknown[] = [input.tenant_id];
  if (input.campaign_id) params.push(input.campaign_id);

  const overall = await queryOne(
    `
    SELECT
      COUNT(*) AS total_interviews,
      COUNT(*) FILTER (WHERE nps_class = 'promoter') AS promoters,
      COUNT(*) FILTER (WHERE nps_class = 'neutral') AS neutrals,
      COUNT(*) FILTER (WHERE nps_class = 'detractor') AS detractors,
      ROUND(
        (COUNT(*) FILTER (WHERE nps_class = 'promoter')::numeric
         - COUNT(*) FILTER (WHERE nps_class = 'detractor')::numeric)
        / NULLIF(COUNT(*), 0) * 100, 1
      ) AS nps_score,
      ROUND(AVG(nps_score), 1) AS avg_nps_raw
    FROM core.enrichment
    WHERE tenant_id = $1 ${campaignFilter}
    `,
    params,
  );

  const bySegment = await query(
    `
    SELECT segment, total_interviews, nps_score
    FROM analytics.vw_nps_by_segment
    WHERE segment IS NOT NULL ${input.campaign_id ? 'AND campaign_id = $2' : ''}
    ORDER BY total_interviews DESC
    `,
    input.campaign_id ? [input.tenant_id, input.campaign_id] : [input.tenant_id],
  );

  const byRegion = await query(
    `
    SELECT region, state, total_interviews, nps_score
    FROM analytics.vw_nps_by_region
    WHERE region IS NOT NULL ${input.campaign_id ? 'AND campaign_id = $2' : ''}
    ORDER BY total_interviews DESC
    LIMIT 15
    `,
    input.campaign_id ? [input.tenant_id, input.campaign_id] : [input.tenant_id],
  );

  const topAccounts = await query(
    `
    SELECT account_name, total_interviews, nps_score
    FROM analytics.vw_nps_by_account
    WHERE TRUE ${input.campaign_id ? 'AND campaign_id = $2' : ''}
    ORDER BY total_interviews DESC
    LIMIT 10
    `,
    input.campaign_id ? [input.tenant_id, input.campaign_id] : [input.tenant_id],
  );

  const sentimentDist = await query(
    `
    SELECT sentiment, COUNT(*) AS count
    FROM core.enrichment
    WHERE tenant_id = $1 ${campaignFilter}
    GROUP BY sentiment
    ORDER BY count DESC
    `,
    params,
  );

  return {
    overall,
    by_segment: bySegment,
    by_region: byRegion,
    top_accounts: topAccounts,
    sentiment_distribution: sentimentDist,
  };
}

// ─── Tool: search_topics ────────────────────────────────────────────────────
export const searchTopicsSchema = {
  name: 'search_topics',
  description:
    'Pesquisa tópicos mencionados nas entrevistas. Mostra frequência de cada tópico e permite filtrar por campanha. ' +
    'Ideal para "Quais os temas mais citados?" ou "O que os detratores falam?".',
  inputSchema: {
    type: 'object' as const,
    properties: {
      tenant_id: { type: 'string', description: 'ID do tenant (obrigatório)' },
      campaign_id: { type: 'string', description: 'Filtrar por campanha' },
      nps_class: { type: 'string', enum: ['promoter', 'neutral', 'detractor'], description: 'Filtrar tópicos por classe NPS' },
      query: { type: 'string', description: 'Buscar tópico específico' },
      limit: { type: 'number', description: 'Máximo de resultados (padrão: 20)' },
    },
    required: ['tenant_id'],
  },
};

const SearchTopicsInput = z.object({
  tenant_id: z.string().uuid(),
  campaign_id: z.string().uuid().optional(),
  nps_class: z.enum(['promoter', 'neutral', 'detractor']).optional(),
  query: z.string().optional(),
  limit: z.number().min(1).max(50).optional(),
});

export async function searchTopics(args: unknown) {
  const input = SearchTopicsInput.parse(args);
  const where: string[] = ['e.tenant_id = $1'];
  const params: unknown[] = [input.tenant_id];

  if (input.campaign_id) {
    params.push(input.campaign_id);
    where.push(`e.campaign_id = $${params.length}`);
  }
  if (input.nps_class) {
    params.push(input.nps_class);
    where.push(`e.nps_class = $${params.length}`);
  }

  const limit = Math.min(input.limit || 20, 50);
  params.push(limit);

  let havingClause = '';
  if (input.query) {
    params.push(`%${input.query}%`);
    havingClause = `HAVING topic ILIKE $${params.length}`;
  }

  const rows = await query(
    `
    SELECT topic, COUNT(*) AS frequency
    FROM core.enrichment e,
         jsonb_array_elements_text(e.topics_json) AS topic
    WHERE ${where.join(' AND ')}
      AND e.topics_json IS NOT NULL
    GROUP BY topic
    ${havingClause}
    ORDER BY frequency DESC
    LIMIT $${params.length - (input.query ? 1 : 0)}
    `,
    params,
  );

  return { topics: rows };
}

// ─── Tool: get_detractor_insights ───────────────────────────────────────────
export const getDetractorInsightsSchema = {
  name: 'get_detractor_insights',
  description:
    'Análise focada nos detratores: lista detratores recentes com drivers negativos, ' +
    'resumos e regiões mais afetadas. Ideal para planos de ação e recuperação de clientes.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      tenant_id: { type: 'string', description: 'ID do tenant (obrigatório)' },
      campaign_id: { type: 'string', description: 'Filtrar por campanha' },
      limit: { type: 'number', description: 'Máximo de detratores listados (padrão: 15)' },
    },
    required: ['tenant_id'],
  },
};

const GetDetractorInsightsInput = z.object({
  tenant_id: z.string().uuid(),
  campaign_id: z.string().uuid().optional(),
  limit: z.number().min(1).max(50).optional(),
});

export async function getDetractorInsights(args: unknown) {
  const input = GetDetractorInsightsInput.parse(args);
  const where: string[] = ['e.tenant_id = $1', "e.nps_class = 'detractor'"];
  const params: unknown[] = [input.tenant_id];

  if (input.campaign_id) {
    params.push(input.campaign_id);
    where.push(`e.campaign_id = $${params.length}`);
  }

  const limit = Math.min(input.limit || 15, 50);
  params.push(limit);

  const detractors = await query(
    `
    SELECT
      v.interview_id, v.respondent_name, v.region, v.state, v.segment,
      v.nps_score, v.sentiment, v.summary_text, v.topics_json,
      e.driver_negative_json, v.completed_at
    FROM analytics.vw_interview_summary v
    JOIN core.enrichment e ON e.interview_id = v.interview_id
    WHERE ${where.join(' AND ')}
    ORDER BY v.completed_at DESC NULLS LAST
    LIMIT $${params.length}
    `,
    params,
  );

  // Top negative drivers across all detractors
  const topDrivers = await query(
    `
    SELECT driver, COUNT(*) AS frequency
    FROM core.enrichment e,
         jsonb_array_elements_text(e.driver_negative_json) AS driver
    WHERE ${where.slice(0, -0).join(' AND ')}
      AND e.nps_class = 'detractor'
      AND e.driver_negative_json IS NOT NULL
    GROUP BY driver
    ORDER BY frequency DESC
    LIMIT 10
    `,
    params.slice(0, -1),
  );

  // Regions most affected
  const regionBreakdown = await query(
    `
    SELECT v.region, v.state, COUNT(*) AS detractor_count
    FROM analytics.vw_interview_summary v
    JOIN core.enrichment e ON e.interview_id = v.interview_id
    WHERE e.tenant_id = $1 AND e.nps_class = 'detractor'
      ${input.campaign_id ? 'AND e.campaign_id = $2' : ''}
      AND v.region IS NOT NULL
    GROUP BY v.region, v.state
    ORDER BY detractor_count DESC
    LIMIT 10
    `,
    input.campaign_id ? [input.tenant_id, input.campaign_id] : [input.tenant_id],
  );

  return {
    total_detractors: detractors.length,
    detractors,
    top_negative_drivers: topDrivers,
    most_affected_regions: regionBreakdown,
  };
}
