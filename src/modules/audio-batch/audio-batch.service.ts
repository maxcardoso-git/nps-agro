import { Injectable, Logger } from '@nestjs/common';
import { AudioBatchRepository } from './audio-batch.repository';
import { AudioService } from '../audio/audio.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AudioBatchService {
  private readonly logger = new Logger(AudioBatchService.name);

  constructor(
    private readonly repo: AudioBatchRepository,
    private readonly audioService: AudioService,
  ) {}

  // ─── Config CRUD ─────────────────────────────────────────────────────────

  async createConfig(tenantId: string, params: Record<string, unknown>) {
    return this.repo.createConfig({ tenant_id: tenantId, ...params } as any); // eslint-disable-line
  }

  async listConfigs(tenantId: string) {
    const configs = await this.repo.listConfigs(tenantId);
    // Add stats for each config
    const result = [];
    for (const config of configs) {
      const stats = await this.repo.getFileStats(config.id);
      result.push({ ...config, stats });
    }
    return result;
  }

  async getConfig(id: string, tenantId: string) {
    return this.repo.getConfig(id, tenantId);
  }

  async updateConfig(id: string, tenantId: string, params: Record<string, unknown>) {
    return this.repo.updateConfig(id, tenantId, params);
  }

  async deleteConfig(id: string, tenantId: string) {
    return this.repo.deleteConfig(id, tenantId);
  }

  async getConfigStatus(id: string, tenantId: string) {
    const config = await this.repo.getConfig(id, tenantId);
    if (!config) return null;
    const stats = await this.repo.getFileStats(id);
    const recentFiles = await this.repo.listFiles(id, undefined, 20);
    return { config, stats, recent_files: recentFiles };
  }

  async listFiles(configId: string, status?: string) {
    return this.repo.listFiles(configId, status, 100);
  }

  // ─── Scan & Process ──────────────────────────────────────────────────────

  async scanFolder(configId: string): Promise<number> {
    const configs = await this.repo.getActiveConfigs();
    const config = configs.find((c) => c.id === configId);
    if (!config) return 0;
    return this.scanConfigFolder(config);
  }

  async scanAllFolders(): Promise<number> {
    const configs = await this.repo.getActiveConfigs();
    let total = 0;
    for (const config of configs) {
      total += await this.scanConfigFolder(config);
    }
    return total;
  }

  private async scanConfigFolder(config: { id: string; source_path: string; file_pattern: string; code_regex: string }): Promise<number> {
    const dir = config.source_path;
    if (!fs.existsSync(dir)) {
      this.logger.warn(`BATCH_SCAN folder not found: ${dir}`);
      return 0;
    }

    const files = fs.readdirSync(dir).filter((f) => {
      // Simple glob matching
      const pattern = config.file_pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
      return new RegExp(`^${pattern}$`, 'i').test(f);
    });

    let added = 0;
    const codeRegex = new RegExp(config.code_regex);

    for (const fileName of files) {
      const exists = await this.repo.fileExists(config.id, fileName);
      if (exists) continue;

      const match = fileName.match(codeRegex);
      const code = match?.[1] || null;

      await this.repo.insertFile({
        config_id: config.id,
        file_name: fileName,
        file_path: path.join(dir, fileName),
        respondent_code: code,
      });
      added++;
    }

    if (added > 0) {
      this.logger.log(`BATCH_SCAN config=${config.id} found=${added} files`);
    }

    await this.repo.updateLastRun(config.id);
    return added;
  }

  async processNextFile(configId: string): Promise<boolean> {
    const file = await this.repo.claimNextFile(configId);
    if (!file) return false;

    this.logger.log(`BATCH_PROCESS file=${file.file_name} code=${file.respondent_code}`);

    try {
      if (!file.respondent_code) {
        await this.repo.skipFile(file.id, 'No respondent code extracted from filename');
        return true;
      }

      // Get config for tenant/action info
      const configs = await this.repo.getActiveConfigs();
      const config = configs.find((c) => c.id === file.config_id);
      if (!config) {
        await this.repo.failFile(file.id, 'Config not found');
        return true;
      }

      // Find respondent by code
      const respondent = await this.repo.findRespondentByCode(config.tenant_id, config.action_id, file.respondent_code);
      if (!respondent) {
        await this.repo.skipFile(file.id, `Respondent not found for code: ${file.respondent_code}`);
        return true;
      }

      // Get questionnaire version
      const actionInfo = await this.repo.getActionQuestionnaireVersion(config.action_id);
      if (!actionInfo) {
        await this.repo.failFile(file.id, 'Action questionnaire version not found');
        return true;
      }

      // Create interview
      const interview = await this.repo.createInterview({
        tenant_id: config.tenant_id,
        campaign_id: config.campaign_id,
        action_id: config.action_id,
        respondent_id: respondent.id,
        questionnaire_version_id: actionInfo.questionnaire_version_id,
      });

      if (!interview) {
        await this.repo.failFile(file.id, 'Failed to create interview');
        return true;
      }

      // Read file and upload
      const fileBuffer = fs.readFileSync(file.file_path);
      await this.audioService.uploadAudio(interview.id, config.tenant_id, {
        buffer: fileBuffer,
        originalname: file.file_name,
        mimetype: 'audio/mp4',
        size: fileBuffer.length,
      });

      await this.repo.completeFile(file.id, respondent.id, interview.id);
      this.logger.log(`BATCH_COMPLETE file=${file.file_name} interview=${interview.id}`);
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await this.repo.failFile(file.id, msg);
      this.logger.error(`BATCH_FAILED file=${file.file_name} error=${msg}`);
      return true;
    }
  }

  async processBatch(configId: string, batchSize = 5): Promise<number> {
    // First scan for new files
    await this.scanFolder(configId);

    // Then process pending files
    let processed = 0;
    for (let i = 0; i < batchSize; i++) {
      const had = await this.processNextFile(configId);
      if (!had) break;
      processed++;
    }
    return processed;
  }
}
