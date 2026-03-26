import { Injectable, Logger } from '@nestjs/common';
import { EnrichmentRepository, InterviewAnswersRow } from './enrichment.repository';

interface LlmEnrichmentResult {
  nps_score: number | null;
  nps_class: 'promoter' | 'neutral' | 'detractor' | null;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed' | null;
  topics: string[];
  summary: string;
  drivers_positive: string[];
  drivers_negative: string[];
  keywords: string[];
  confidence: number;
}

@Injectable()
export class EnrichmentService {
  private readonly logger = new Logger(EnrichmentService.name);

  constructor(private readonly repo: EnrichmentRepository) {}

  async processNextJob(): Promise<boolean> {
    const job = await this.repo.claimPendingJob('ai_enrichment');
    if (!job) return false;

    this.logger.log(`ENRICHMENT_JOB_START job_id=${job.id} interview_id=${job.interview_id}`);

    try {
      const exists = await this.repo.enrichmentExists(job.interview_id);
      if (exists) {
        await this.repo.completeJob(job.id, { skipped: true, reason: 'already_enriched' });
        this.logger.log(`ENRICHMENT_SKIPPED job_id=${job.id} reason=already_enriched`);
        return true;
      }

      const answers = await this.repo.getInterviewAnswers(job.interview_id);
      const respondent = await this.repo.getRespondentInfo(job.interview_id);

      // Get LLM resource for enrichment (fallback to general)
      let llm = await this.repo.getLlmResource(job.tenant_id, 'enrichment');
      if (!llm) llm = await this.repo.getLlmResource(job.tenant_id, 'general');

      let result: LlmEnrichmentResult;

      if (llm?.api_key) {
        result = await this.callLlm(llm, answers, respondent);
      } else {
        // Rule-based fallback when no LLM is configured
        result = this.ruleBasedEnrichment(answers);
        this.logger.warn(`ENRICHMENT_FALLBACK job_id=${job.id} reason=no_llm_configured`);
      }

      await this.repo.insertEnrichment({
        tenant_id: job.tenant_id,
        campaign_id: job.campaign_id,
        interview_id: job.interview_id,
        nps_score: result.nps_score,
        nps_class: result.nps_class,
        sentiment: result.sentiment,
        topics_json: result.topics.length > 0 ? result.topics : null,
        summary_text: result.summary || null,
        driver_positive_json: result.drivers_positive.length > 0 ? result.drivers_positive : null,
        driver_negative_json: result.drivers_negative.length > 0 ? result.drivers_negative : null,
        keywords_json: result.keywords.length > 0 ? result.keywords : null,
        confidence_score: result.confidence,
        enrichment_model: llm?.api_key ? `${llm.provider}/${llm.model_id}` : 'rule-based',
      });

      await this.repo.completeJob(job.id, {
        enrichment_model: llm?.api_key ? `${llm.provider}/${llm.model_id}` : 'rule-based',
        nps_score: result.nps_score,
        sentiment: result.sentiment,
      });

      this.logger.log(`ENRICHMENT_COMPLETE job_id=${job.id} interview_id=${job.interview_id} model=${llm?.api_key ? llm.model_id : 'rule-based'}`);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.repo.failJob(job.id, message);
      this.logger.error(`ENRICHMENT_FAILED job_id=${job.id} error=${message}`);
      return true;
    }
  }

  async processBatch(batchSize = 10): Promise<number> {
    let processed = 0;
    for (let i = 0; i < batchSize; i++) {
      const hadJob = await this.processNextJob();
      if (!hadJob) break;
      processed++;
    }
    return processed;
  }

  async getPendingCount(): Promise<number> {
    return this.repo.countPendingJobs('ai_enrichment');
  }

  // ─── LLM Call ────────────────────────────────────────────────────────────────

  private async callLlm(
    llm: { provider: string; model_id: string; api_key: string | null; base_url: string | null; config_json: Record<string, unknown> },
    answers: InterviewAnswersRow[],
    respondent: { respondent_name: string; region: string; segment: string; account_name: string | null } | null,
  ): Promise<LlmEnrichmentResult> {
    const prompt = this.buildPrompt(answers, respondent);

    const baseUrl = this.resolveBaseUrl(llm.provider, llm.base_url);
    const model = llm.model_id;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (llm.provider === 'anthropic') {
      headers['x-api-key'] = llm.api_key!;
      headers['anthropic-version'] = '2023-06-01';
    } else {
      headers['Authorization'] = `Bearer ${llm.api_key}`;
    }

    const body = llm.provider === 'anthropic'
      ? {
          model,
          max_tokens: 2048,
          messages: [{ role: 'user', content: prompt }],
        }
      : {
          model,
          messages: [
            { role: 'system', content: 'You are an NPS survey analysis assistant. Always respond with valid JSON.' },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        };

    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // Extract text content from response
    let textContent: string;
    if (llm.provider === 'anthropic') {
      textContent = data.content?.[0]?.text ?? '';
    } else {
      textContent = data.choices?.[0]?.message?.content ?? '';
    }

    return this.parseLlmResponse(textContent);
  }

  private resolveBaseUrl(provider: string, customUrl: string | null): string {
    if (customUrl) return customUrl.replace(/\/+$/, '');
    switch (provider) {
      case 'anthropic': return 'https://api.anthropic.com/v1';
      case 'openai': return 'https://api.openai.com/v1/chat';
      case 'google': return 'https://generativelanguage.googleapis.com/v1beta';
      default: return 'https://api.openai.com/v1/chat';
    }
  }

  private buildPrompt(
    answers: InterviewAnswersRow[],
    respondent: { respondent_name: string; region: string; segment: string; account_name: string | null } | null,
  ): string {
    const answersText = answers.map((a) => {
      const value = a.value_text ?? a.value_numeric ?? a.value_boolean ?? JSON.stringify(a.value_json);
      return `- ${a.question_id} (${a.answer_type}): ${value}`;
    }).join('\n');

    const context = respondent
      ? `Respondente: ${respondent.respondent_name}, Região: ${respondent.region || 'N/A'}, Segmento: ${respondent.segment || 'N/A'}, Conta: ${respondent.account_name || 'N/A'}`
      : '';

    return `Analise esta entrevista NPS de pesquisa agrícola e retorne um JSON com a estrutura abaixo.

${context}

Respostas da entrevista:
${answersText}

Retorne APENAS um JSON válido com esta estrutura:
{
  "nps_score": <número 0-10 se houver pergunta NPS, ou null>,
  "nps_class": "<promoter|neutral|detractor ou null>",
  "sentiment": "<positive|negative|neutral|mixed>",
  "topics": ["tema1", "tema2"],
  "summary": "Resumo em 2-3 frases da entrevista",
  "drivers_positive": ["driver positivo 1"],
  "drivers_negative": ["driver negativo 1"],
  "keywords": ["keyword1", "keyword2"],
  "confidence": <0.0 a 1.0>
}

Regras:
- NPS 9-10 = promoter, 7-8 = neutral, 0-6 = detractor
- Extraia tópicos relevantes ao agronegócio
- Summary em português
- Se dados insuficientes, use confidence baixa`;
  }

  private parseLlmResponse(text: string): LlmEnrichmentResult {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('LLM response does not contain valid JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      nps_score: typeof parsed.nps_score === 'number' ? parsed.nps_score : null,
      nps_class: ['promoter', 'neutral', 'detractor'].includes(parsed.nps_class) ? parsed.nps_class : null,
      sentiment: ['positive', 'negative', 'neutral', 'mixed'].includes(parsed.sentiment) ? parsed.sentiment : null,
      topics: Array.isArray(parsed.topics) ? parsed.topics.filter((t: unknown) => typeof t === 'string') : [],
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      drivers_positive: Array.isArray(parsed.drivers_positive) ? parsed.drivers_positive : [],
      drivers_negative: Array.isArray(parsed.drivers_negative) ? parsed.drivers_negative : [],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
    };
  }

  // ─── Rule-based fallback ─────────────────────────────────────────────────────

  private ruleBasedEnrichment(answers: InterviewAnswersRow[]): LlmEnrichmentResult {
    // Find NPS score from answers
    const npsAnswer = answers.find((a) => a.answer_type === 'nps' || a.question_id.toLowerCase().includes('nps'));
    const npsScore = npsAnswer?.value_numeric ?? null;

    let npsClass: 'promoter' | 'neutral' | 'detractor' | null = null;
    if (npsScore !== null) {
      if (npsScore >= 9) npsClass = 'promoter';
      else if (npsScore >= 7) npsClass = 'neutral';
      else npsClass = 'detractor';
    }

    // Simple sentiment from NPS
    let sentiment: 'positive' | 'negative' | 'neutral' | null = null;
    if (npsScore !== null) {
      if (npsScore >= 9) sentiment = 'positive';
      else if (npsScore >= 7) sentiment = 'neutral';
      else sentiment = 'negative';
    }

    // Collect text answers for summary
    const textAnswers = answers
      .filter((a) => a.value_text && a.value_text.trim().length > 0)
      .map((a) => a.value_text!);

    const summary = textAnswers.length > 0
      ? textAnswers.join('. ').substring(0, 500)
      : '';

    return {
      nps_score: npsScore,
      nps_class: npsClass,
      sentiment,
      topics: [],
      summary,
      drivers_positive: [],
      drivers_negative: [],
      keywords: [],
      confidence: 0.3,
    };
  }
}
