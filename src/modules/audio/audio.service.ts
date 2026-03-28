import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { DomainException } from '../../common/errors';
import { AudioRepository } from './audio.repository';
import * as fs from 'fs';
import * as path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';
const WHISPER_URL = process.env.WHISPER_URL || 'http://nps-whisper:9000';
const CONFIDENCE_THRESHOLD = 0.7;

interface QuestionSchema {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
  scale?: { min: number; max: number };
}

@Injectable()
export class AudioService {
  private readonly logger = new Logger(AudioService.name);

  constructor(private readonly repo: AudioRepository) {}

  // ─── Upload ───────────────────────────────────────────────────────────────

  async uploadAudio(
    interviewId: string,
    tenantId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    const interview = await this.repo.getInterviewContext(interviewId);
    if (!interview) throw new DomainException('INTERVIEW_NOT_FOUND', 'Entrevista não encontrada', HttpStatus.NOT_FOUND);
    if (interview.tenant_id !== tenantId) throw new DomainException('FORBIDDEN', 'Acesso negado', HttpStatus.FORBIDDEN);

    // Save file to disk
    const dir = path.join(UPLOAD_DIR, tenantId, interviewId);
    fs.mkdirSync(dir, { recursive: true });
    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    const fileUrl = `/uploads/${tenantId}/${interviewId}/${fileName}`;

    const asset = await this.repo.createAudioAsset({
      tenant_id: tenantId,
      campaign_id: interview.campaign_id,
      interview_id: interviewId,
      file_name: fileName,
      file_url: fileUrl,
      mime_type: file.mimetype,
    });

    // Create transcription job
    await this.repo.createProcessingJob({
      tenant_id: tenantId,
      campaign_id: interview.campaign_id,
      interview_id: interviewId,
      job_type: 'audio_transcription',
      payload_json: { audio_id: asset!.id, file_url: fileUrl, file_path: filePath },
    });

    this.logger.log(`AUDIO_UPLOADED interview_id=${interviewId} file=${fileName}`);
    return asset;
  }

  async getAudioByInterview(interviewId: string) {
    return this.repo.getByInterviewId(interviewId);
  }

  // ─── Transcription Worker ─────────────────────────────────────────────────

  async processTranscriptionJob(): Promise<boolean> {
    const job = await this.repo.claimJob('audio_transcription');
    if (!job) return false;

    this.logger.log(`TRANSCRIPTION_START job_id=${job.id} interview_id=${job.interview_id}`);

    try {
      const audioId = job.payload_json.audio_id as string;
      const filePath = job.payload_json.file_path as string;

      // Try to find a transcription resource
      let resource = await this.repo.getResource(job.tenant_id, 'llm', 'transcription');
      if (!resource) resource = await this.repo.getResource(job.tenant_id, 'api_http', 'transcription');

      // Also check ai.llm_resource for backward compatibility
      const llmResource = await this.repo.getLlmResource(job.tenant_id, 'transcription');

      let transcription: string;
      let confidence: number;

      if (llmResource?.api_key) {
        // Use LLM resource (Whisper via OpenAI API)
        const result = await this.transcribeWithWhisperApi(llmResource, filePath);
        transcription = result.text;
        confidence = result.confidence;
      } else if (resource?.endpoint_url) {
        // Use generic resource endpoint
        const result = await this.transcribeWithResource(resource, filePath);
        transcription = result.text;
        confidence = result.confidence;
      } else {
        // Fallback: local Whisper container (free, no API key needed)
        const result = await this.transcribeWithLocalWhisper(filePath);
        transcription = result.text;
        confidence = result.confidence;
      }

      await this.repo.updateTranscription(audioId, transcription, confidence);

      // Create answer extraction job
      await this.repo.createProcessingJob({
        tenant_id: job.tenant_id,
        campaign_id: job.campaign_id,
        interview_id: job.interview_id,
        job_type: 'answer_extraction',
        payload_json: { audio_id: audioId, transcription },
      });

      await this.repo.completeJob(job.id, { transcription_length: transcription.length, confidence });
      this.logger.log(`TRANSCRIPTION_COMPLETE job_id=${job.id} chars=${transcription.length} confidence=${confidence}`);
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await this.repo.failJob(job.id, msg);
      this.logger.error(`TRANSCRIPTION_FAILED job_id=${job.id} error=${msg}`);
      return true;
    }
  }

  // ─── Answer Extraction Worker ─────────────────────────────────────────────

  async processExtractionJob(): Promise<boolean> {
    const job = await this.repo.claimJob('answer_extraction');
    if (!job) return false;

    this.logger.log(`EXTRACTION_START job_id=${job.id} interview_id=${job.interview_id}`);

    try {
      const transcription = job.payload_json.transcription as string;

      const interview = await this.repo.getInterviewContext(job.interview_id);
      if (!interview) throw new Error('Interview not found');

      const version = await this.repo.getQuestionnaireSchema(interview.questionnaire_version_id);
      if (!version?.schema_json) throw new Error('Questionnaire schema not found');

      const schema = version.schema_json as { meta?: { ai_instructions?: string }; questions: QuestionSchema[] };
      const aiInstructions = schema.meta?.ai_instructions || '';

      // Get LLM for extraction
      let llm = await this.repo.getLlmResource(job.tenant_id, 'enrichment');
      if (!llm) llm = await this.repo.getLlmResource(job.tenant_id, 'general');

      let answers: Array<{ question_id: string; value: unknown; confidence: number }>;

      if (llm?.api_key) {
        answers = await this.extractWithLlm(llm, transcription, schema.questions, aiInstructions);
      } else {
        answers = this.extractRuleBased(transcription, schema.questions);
      }

      // Persist extracted answers
      let lowConfidenceCount = 0;
      for (const answer of answers) {
        const question = schema.questions.find((q) => q.id === answer.question_id);
        if (!question) continue;

        if (answer.confidence < CONFIDENCE_THRESHOLD) lowConfidenceCount++;

        await this.repo.insertAnswer({
          tenant_id: job.tenant_id,
          campaign_id: job.campaign_id,
          interview_id: job.interview_id,
          questionnaire_version_id: interview.questionnaire_version_id,
          question_id: answer.question_id,
          answer_type: question.type,
          value_numeric: ['nps', 'scale', 'number'].includes(question.type) ? Number(answer.value) : null,
          value_text: ['text', 'single_choice'].includes(question.type) ? String(answer.value) : null,
          value_boolean: question.type === 'boolean' ? Boolean(answer.value) : null,
          value_json: question.type === 'multi_choice' ? answer.value : null,
          confidence_score: answer.confidence,
        });
      }

      // Calculate adherence score
      if (llm?.api_key) {
        try {
          const adherence = await this.calculateAdherence(llm, transcription, schema.questions, answers);
          await this.repo.updateAdherence(job.interview_id, adherence.score, adherence.details);
          this.logger.log(`ADHERENCE_CALCULATED interview_id=${job.interview_id} score=${adherence.score}`);
        } catch (e) {
          this.logger.warn(`ADHERENCE_FAILED interview_id=${job.interview_id} error=${e instanceof Error ? e.message : e}`);
        }
      }

      // Decide interview status based on confidence
      const avgConfidence = answers.length > 0
        ? answers.reduce((sum, a) => sum + a.confidence, 0) / answers.length
        : 0;

      if (avgConfidence >= CONFIDENCE_THRESHOLD && lowConfidenceCount === 0) {
        await this.repo.updateInterviewStatus(job.interview_id, 'completed');
        // Trigger enrichment
        await this.repo.createProcessingJob({
          tenant_id: job.tenant_id,
          campaign_id: job.campaign_id,
          interview_id: job.interview_id,
          job_type: 'ai_enrichment',
          payload_json: { trigger: 'audio_extraction', avg_confidence: avgConfidence },
        });
      } else {
        await this.repo.updateInterviewStatus(job.interview_id, 'review_pending');
      }

      await this.repo.completeJob(job.id, {
        answers_extracted: answers.length,
        avg_confidence: avgConfidence,
        low_confidence_count: lowConfidenceCount,
        status: avgConfidence >= CONFIDENCE_THRESHOLD ? 'completed' : 'review_pending',
      });

      this.logger.log(`EXTRACTION_COMPLETE job_id=${job.id} answers=${answers.length} avg_conf=${avgConfidence.toFixed(2)}`);
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await this.repo.failJob(job.id, msg);
      this.logger.error(`EXTRACTION_FAILED job_id=${job.id} error=${msg}`);
      return true;
    }
  }

  // ─── Transcription Providers ──────────────────────────────────────────────

  private async transcribeWithLocalWhisper(filePath: string): Promise<{ text: string; confidence: number }> {
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);

    const formData = new FormData();
    formData.append('audio_file', new Blob([fileBuffer]), fileName);

    const response = await fetch(`${WHISPER_URL}/asr?language=pt&output=json`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(600_000), // 10 min timeout for large audio
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Local Whisper error ${response.status}: ${errorText}`);
    }

    const data = await response.json() as Record<string, unknown>;
    return {
      text: (data.text as string) || '',
      confidence: 0.85, // Local Whisper medium model has good accuracy for PT-BR
    };
  }

  private async transcribeWithWhisperApi(
    llm: { provider: string; model_id: string; api_key: string | null; base_url: string | null },
    filePath: string,
  ): Promise<{ text: string; confidence: number }> {
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);

    const baseUrl = llm.base_url || 'https://api.openai.com/v1';
    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer]), fileName);
    formData.append('model', llm.model_id || 'whisper-1');
    formData.append('language', 'pt');
    formData.append('response_format', 'verbose_json');

    const response = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${llm.api_key}` },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Whisper API error ${response.status}: ${errorText}`);
    }

    const data = await response.json() as Record<string, unknown>;
    const text = (data.text as string) || '';
    // Whisper verbose_json includes segments with avg_logprob
    const segments = data.segments as Array<{ avg_logprob?: number }> | undefined;
    const avgLogprob = segments?.length
      ? segments.reduce((sum, s) => sum + (s.avg_logprob || -1), 0) / segments.length
      : -0.5;
    // Convert log probability to 0-1 confidence
    const confidence = Math.min(1, Math.max(0, 1 + avgLogprob));

    return { text, confidence };
  }

  private async transcribeWithResource(
    resource: { endpoint_url: string | null; auth_mode: string; auth_config: Record<string, unknown>; config_json: Record<string, unknown> },
    filePath: string,
  ): Promise<{ text: string; confidence: number }> {
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);

    const headers: Record<string, string> = {};
    if (resource.auth_mode === 'bearer') {
      headers['Authorization'] = `Bearer ${resource.auth_config.token || resource.auth_config.api_key}`;
    } else if (resource.auth_mode === 'api_key') {
      const headerName = (resource.auth_config.header_name as string) || 'X-API-Key';
      headers[headerName] = (resource.auth_config.api_key as string) || '';
    }

    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer]), fileName);
    formData.append('language', 'pt');

    const response = await fetch(resource.endpoint_url!, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) throw new Error(`Transcription API error ${response.status}`);

    const data = await response.json() as Record<string, unknown>;
    return {
      text: (data.text as string) || (data.transcription as string) || '',
      confidence: (data.confidence as number) || 0.8,
    };
  }

  // ─── Answer Extraction via LLM ────────────────────────────────────────────

  private async extractWithLlm(
    llm: { provider: string; model_id: string; api_key: string | null; base_url: string | null },
    transcription: string,
    questions: QuestionSchema[],
    aiInstructions?: string,
  ): Promise<Array<{ question_id: string; value: unknown; confidence: number }>> {
    const questionsDesc = questions.map((q) => {
      let desc = `- ${q.id} (${q.type}): "${q.label}"`;
      if (q.options) desc += ` [opções: ${q.options.join(', ')}]`;
      if (q.type === 'nps') desc += ' [escala 0-10]';
      if (q.scale) desc += ` [escala ${q.scale.min}-${q.scale.max}]`;
      return desc;
    }).join('\n');

    const instructionsBlock = aiInstructions ? `\nInstruções especiais:\n${aiInstructions}\n` : '';

    const prompt = `Analise a transcrição de uma entrevista NPS agrícola e extraia as respostas para cada pergunta do questionário.
${instructionsBlock}

Transcrição:
"""
${transcription}
"""

Perguntas do questionário:
${questionsDesc}

Retorne APENAS um JSON array com as respostas encontradas:
[
  { "question_id": "id_da_pergunta", "value": <valor extraído>, "confidence": <0.0 a 1.0> }
]

Regras:
- Para NPS: valor numérico 0-10
- Para scale: valor numérico dentro da escala
- Para single_choice: uma das opções listadas
- Para multi_choice: array de opções
- Para boolean: true ou false
- Para text: string com a resposta
- Para number: valor numérico
- confidence: 1.0 se claramente mencionado, 0.5 se inferido, 0.3 se incerto
- Omita perguntas que não foram respondidas na transcrição`;

    let text: string;

    if (llm.provider === 'google') {
      // Gemini API
      const baseUrl = llm.base_url || 'https://generativelanguage.googleapis.com/v1beta';
      const endpoint = `${baseUrl}/models/${llm.model_id}:generateContent?key=${llm.api_key}`;
      const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
      };
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`Gemini API error ${response.status}: ${await response.text()}`);
      const data = await response.json() as Record<string, unknown>;
      const candidates = data.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined;
      text = candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    } else if (llm.provider === 'anthropic') {
      const baseUrl = llm.base_url || 'https://api.anthropic.com/v1';
      const response = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': llm.api_key!, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: llm.model_id, max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }),
      });
      if (!response.ok) throw new Error(`Anthropic API error ${response.status}: ${await response.text()}`);
      const data = await response.json() as Record<string, unknown>;
      const content = data.content as Array<{ text?: string }> | undefined;
      text = content?.[0]?.text ?? '';
    } else {
      // OpenAI compatible
      const baseUrl = llm.base_url || 'https://api.openai.com/v1/chat';
      const response = await fetch(`${baseUrl}/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${llm.api_key}` },
        body: JSON.stringify({ model: llm.model_id, messages: [{ role: 'system', content: 'Extract answers from interview transcription. Respond with valid JSON only.' }, { role: 'user', content: prompt }], response_format: { type: 'json_object' }, temperature: 0.1 }),
      });
      if (!response.ok) throw new Error(`OpenAI API error ${response.status}: ${await response.text()}`);
      const data = await response.json() as Record<string, unknown>;
      const choices = data.choices as Array<{ message?: { content?: string } }> | undefined;
      text = choices?.[0]?.message?.content ?? '';
    }

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]) as Array<{ question_id: string; value: unknown; confidence: number }>;
    return parsed.filter((a) => a.question_id && a.value !== undefined && typeof a.confidence === 'number');
  }

  // ─── Rule-based extraction fallback ───────────────────────────────────────

  // ─── Adherence calculation ─────────────────────────────────────────────

  private async calculateAdherence(
    llm: { provider: string; model_id: string; api_key: string | null; base_url: string | null },
    transcription: string,
    questions: QuestionSchema[],
    answers: Array<{ question_id: string; value: unknown; confidence: number }>,
  ): Promise<{ score: number; details: Array<{ question_id: string; asked: boolean; followed_script: boolean; notes: string }> }> {
    const questionsDesc = questions.map((q) => `- ${q.id}: "${q.label}" (${q.type})`).join('\n');
    const answeredIds = answers.map((a) => a.question_id);

    const prompt = `Analise a aderência do entrevistador ao roteiro do questionário NPS.

Transcrição da entrevista:
"""
${transcription.substring(0, 3000)}
"""

Perguntas do questionário (roteiro):
${questionsDesc}

Perguntas que tiveram resposta extraída: ${answeredIds.join(', ')}

Avalie para CADA pergunta do questionário:
1. "asked": o entrevistador fez esta pergunta? (true/false)
2. "followed_script": seguiu o roteiro/fraseado correto? (true/false)
3. "notes": observação breve (max 20 palavras)

Retorne um JSON:
{
  "score": <0-100 aderência geral>,
  "details": [
    { "question_id": "id", "asked": true/false, "followed_script": true/false, "notes": "..." }
  ]
}`;

    let text: string;
    if (llm.provider === 'google') {
      const baseUrl = llm.base_url || 'https://generativelanguage.googleapis.com/v1beta';
      const response = await fetch(`${baseUrl}/models/${llm.model_id}:generateContent?key=${llm.api_key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 2048 } }),
      });
      if (!response.ok) throw new Error(`Gemini API error ${response.status}`);
      const data = await response.json() as Record<string, unknown>;
      const candidates = data.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined;
      text = candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    } else if (llm.provider === 'anthropic') {
      const baseUrl = llm.base_url || 'https://api.anthropic.com/v1';
      const response = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': llm.api_key!, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: llm.model_id, max_tokens: 2048, messages: [{ role: 'user', content: prompt }] }),
      });
      if (!response.ok) throw new Error(`Anthropic error ${response.status}`);
      const data = await response.json() as Record<string, unknown>;
      text = (data.content as Array<{ text?: string }>)?.[0]?.text ?? '';
    } else {
      const baseUrl = llm.base_url || 'https://api.openai.com/v1/chat';
      const response = await fetch(`${baseUrl}/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${llm.api_key}` },
        body: JSON.stringify({ model: llm.model_id, messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }, temperature: 0.1 }),
      });
      if (!response.ok) throw new Error(`OpenAI error ${response.status}`);
      const data = await response.json() as Record<string, unknown>;
      text = (data.choices as Array<{ message?: { content?: string } }>)?.[0]?.message?.content ?? '';
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { score: 0, details: [] };

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      score: typeof parsed.score === 'number' ? parsed.score : 0,
      details: Array.isArray(parsed.details) ? parsed.details : [],
    };
  }

  private extractRuleBased(
    transcription: string,
    questions: QuestionSchema[],
  ): Array<{ question_id: string; value: unknown; confidence: number }> {
    const answers: Array<{ question_id: string; value: unknown; confidence: number }> = [];
    const lower = transcription.toLowerCase();

    for (const q of questions) {
      if (q.type === 'nps') {
        const npsMatch = lower.match(/nota\s*(\d+)|(\d+)\s*(de\s*10|pontos)/);
        if (npsMatch) {
          const score = parseInt(npsMatch[1] || npsMatch[2], 10);
          if (score >= 0 && score <= 10) {
            answers.push({ question_id: q.id, value: score, confidence: 0.6 });
          }
        }
      }

      if (q.type === 'boolean') {
        if (lower.includes('sim') || lower.includes('concordo') || lower.includes('positivo')) {
          answers.push({ question_id: q.id, value: true, confidence: 0.4 });
        } else if (lower.includes('não') || lower.includes('discordo') || lower.includes('negativo')) {
          answers.push({ question_id: q.id, value: false, confidence: 0.4 });
        }
      }
    }

    return answers;
  }
}
