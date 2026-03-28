import { Injectable } from '@nestjs/common';
import { SqlRepositoryBase } from '../../common/sql.repository.base';
import { DatabaseService } from '../../common/database.service';

export interface BatchConfigRow {
  id: string;
  tenant_id: string;
  campaign_id: string;
  action_id: string;
  name: string;
  source_path: string;
  file_pattern: string;
  code_regex: string;
  schedule_cron: string;
  is_active: boolean;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BatchFileRow {
  id: string;
  config_id: string;
  file_name: string;
  file_path: string;
  respondent_code: string | null;
  respondent_id: string | null;
  interview_id: string | null;
  status: string;
  error_message: string | null;
  processed_at: string | null;
  created_at: string;
}

@Injectable()
export class AudioBatchRepository extends SqlRepositoryBase {
  constructor(db: DatabaseService) {
    super(db);
  }

  // ─── Config CRUD ─────────────────────────────────────────────────────────

  createConfig(params: {
    tenant_id: string; campaign_id: string; action_id: string; name: string;
    source_path: string; file_pattern?: string; code_regex?: string; schedule_cron?: string;
  }): Promise<BatchConfigRow | null> {
    return this.one<BatchConfigRow>(
      `INSERT INTO core.audio_batch_config (tenant_id, campaign_id, action_id, name, source_path, file_pattern, code_regex, schedule_cron)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [params.tenant_id, params.campaign_id, params.action_id, params.name, params.source_path,
       params.file_pattern || '*.mp4', params.code_regex || '(\\w+)', params.schedule_cron || '*/30 * * * *'],
    );
  }

  listConfigs(tenantId: string): Promise<BatchConfigRow[]> {
    return this.many<BatchConfigRow>(
      `SELECT * FROM core.audio_batch_config WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId],
    );
  }

  getConfig(id: string, tenantId: string): Promise<BatchConfigRow | null> {
    return this.one<BatchConfigRow>(
      `SELECT * FROM core.audio_batch_config WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );
  }

  updateConfig(id: string, tenantId: string, params: Record<string, unknown>): Promise<BatchConfigRow | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    const allowed = ['name', 'source_path', 'file_pattern', 'code_regex', 'schedule_cron', 'is_active', 'campaign_id', 'action_id'];
    for (const key of allowed) {
      if (params[key] !== undefined) {
        values.push(params[key]);
        fields.push(`${key} = $${values.length}`);
      }
    }
    if (fields.length === 0) return this.getConfig(id, tenantId);
    values.push(id, tenantId);
    return this.one<BatchConfigRow>(
      `UPDATE core.audio_batch_config SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length - 1} AND tenant_id = $${values.length} RETURNING *`,
      values,
    );
  }

  deleteConfig(id: string, tenantId: string): Promise<boolean> {
    return this.execute(`DELETE FROM core.audio_batch_config WHERE id = $1 AND tenant_id = $2`, [id, tenantId]).then((c) => c > 0);
  }

  updateLastRun(configId: string) {
    return this.execute(`UPDATE core.audio_batch_config SET last_run_at = NOW() WHERE id = $1`, [configId]);
  }

  getActiveConfigs(): Promise<BatchConfigRow[]> {
    return this.many<BatchConfigRow>(`SELECT * FROM core.audio_batch_config WHERE is_active = true`);
  }

  // ─── File tracking ───────────────────────────────────────────────────────

  fileExists(configId: string, fileName: string): Promise<boolean> {
    return this.one<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM core.audio_batch_file WHERE config_id = $1 AND file_name = $2) AS exists`,
      [configId, fileName],
    ).then((r) => r?.exists ?? false);
  }

  insertFile(params: {
    config_id: string; file_name: string; file_path: string; respondent_code: string | null;
  }): Promise<BatchFileRow | null> {
    return this.one<BatchFileRow>(
      `INSERT INTO core.audio_batch_file (config_id, file_name, file_path, respondent_code)
       VALUES ($1,$2,$3,$4) ON CONFLICT (config_id, file_name) DO NOTHING RETURNING *`,
      [params.config_id, params.file_name, params.file_path, params.respondent_code],
    );
  }

  claimNextFile(configId: string): Promise<BatchFileRow | null> {
    return this.one<BatchFileRow>(
      `UPDATE core.audio_batch_file SET status = 'processing'
       WHERE id = (SELECT id FROM core.audio_batch_file WHERE config_id = $1 AND status = 'pending' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED)
       RETURNING *`,
      [configId],
    );
  }

  completeFile(fileId: string, respondentId: string | null, interviewId: string | null) {
    return this.execute(
      `UPDATE core.audio_batch_file SET status = 'completed', respondent_id = $2, interview_id = $3, processed_at = NOW() WHERE id = $1`,
      [fileId, respondentId, interviewId],
    );
  }

  failFile(fileId: string, error: string) {
    return this.execute(
      `UPDATE core.audio_batch_file SET status = 'failed', error_message = $2, processed_at = NOW() WHERE id = $1`,
      [fileId, error],
    );
  }

  skipFile(fileId: string, reason: string) {
    return this.execute(
      `UPDATE core.audio_batch_file SET status = 'skipped', error_message = $2, processed_at = NOW() WHERE id = $1`,
      [fileId, reason],
    );
  }

  getFileStats(configId: string) {
    return this.one<{ total: number; pending: number; processing: number; completed: number; failed: number; skipped: number }>(
      `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'processing')::int AS processing,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
        COUNT(*) FILTER (WHERE status = 'skipped')::int AS skipped
      FROM core.audio_batch_file WHERE config_id = $1`,
      [configId],
    );
  }

  listFiles(configId: string, status?: string, limit = 50): Promise<BatchFileRow[]> {
    const where = ['config_id = $1'];
    const params: unknown[] = [configId];
    if (status) { params.push(status); where.push(`status = $${params.length}`); }
    params.push(limit);
    return this.many<BatchFileRow>(
      `SELECT * FROM core.audio_batch_file WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT $${params.length}`,
      params,
    );
  }

  findRespondentByCode(tenantId: string, actionId: string, code: string) {
    return this.one<{ id: string; campaign_id: string; name: string }>(
      `SELECT id, campaign_id, name FROM core.respondent WHERE tenant_id = $1 AND action_id = $2 AND external_id = $3`,
      [tenantId, actionId, code],
    );
  }

  createInterview(params: { tenant_id: string; campaign_id: string; action_id: string; respondent_id: string; questionnaire_version_id: string }) {
    return this.one<{ id: string }>(
      `INSERT INTO core.interview (tenant_id, campaign_id, action_id, respondent_id, questionnaire_version_id, channel, status, started_at)
       VALUES ($1,$2,$3,$4,$5,'voice_upload','in_progress',NOW())
       RETURNING id`,
      [params.tenant_id, params.campaign_id, params.action_id, params.respondent_id, params.questionnaire_version_id],
    );
  }

  getActionQuestionnaireVersion(actionId: string) {
    return this.one<{ questionnaire_version_id: string }>(
      `SELECT questionnaire_version_id FROM core.campaign_action WHERE id = $1`,
      [actionId],
    );
  }
}
