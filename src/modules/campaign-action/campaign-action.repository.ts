import { Injectable } from '@nestjs/common';
import { SqlRepositoryBase } from '../../common/sql.repository.base';
import { DatabaseService } from '../../common/database.service';

export interface ActionRow {
  id: string;
  tenant_id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  questionnaire_version_id: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActionWithMeta extends ActionRow {
  questionnaire_name: string | null;
  respondent_count: number;
  interviewer_count: number;
}

@Injectable()
export class CampaignActionRepository extends SqlRepositoryBase {
  constructor(db: DatabaseService) {
    super(db);
  }

  create(params: {
    tenant_id: string;
    campaign_id: string;
    name: string;
    description?: string;
    questionnaire_version_id: string;
    start_date?: string;
    end_date?: string;
  }): Promise<ActionRow | null> {
    return this.one<ActionRow>(
      `INSERT INTO core.campaign_action
       (tenant_id, campaign_id, name, description, questionnaire_version_id, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        params.tenant_id,
        params.campaign_id,
        params.name,
        params.description ?? null,
        params.questionnaire_version_id,
        params.start_date ?? null,
        params.end_date ?? null,
      ],
    );
  }

  findById(actionId: string, tenantId: string): Promise<ActionRow | null> {
    return this.one<ActionRow>(
      `SELECT * FROM core.campaign_action WHERE id = $1 AND tenant_id = $2`,
      [actionId, tenantId],
    );
  }

  listByCampaign(campaignId: string, tenantId: string): Promise<ActionWithMeta[]> {
    return this.many<ActionWithMeta>(
      `SELECT a.*,
        q.name AS questionnaire_name,
        COALESCE(rc.cnt, 0)::int AS respondent_count,
        COALESCE(ic.cnt, 0)::int AS interviewer_count
       FROM core.campaign_action a
       LEFT JOIN core.questionnaire_version qv ON qv.id = a.questionnaire_version_id
       LEFT JOIN core.questionnaire q ON q.id = qv.questionnaire_id
       LEFT JOIN (SELECT action_id, COUNT(*) AS cnt FROM core.respondent GROUP BY action_id) rc ON rc.action_id = a.id
       LEFT JOIN (SELECT action_id, COUNT(*) AS cnt FROM core.action_interviewer GROUP BY action_id) ic ON ic.action_id = a.id
       WHERE a.campaign_id = $1 AND a.tenant_id = $2
       ORDER BY a.created_at`,
      [campaignId, tenantId],
    );
  }

  update(actionId: string, tenantId: string, params: Record<string, unknown>): Promise<ActionRow | null> {
    const sets: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [];
    let idx = 1;

    const allowed = ['name', 'description', 'questionnaire_version_id', 'status', 'start_date', 'end_date'];
    for (const key of allowed) {
      if (params[key] !== undefined) {
        values.push(params[key]);
        sets.push(`${key} = $${idx++}`);
      }
    }

    values.push(actionId, tenantId);

    return this.one<ActionRow>(
      `UPDATE core.campaign_action SET ${sets.join(', ')} WHERE id = $${idx++} AND tenant_id = $${idx} RETURNING *`,
      values,
    );
  }

  async setInterviewers(actionId: string, userIds: string[]): Promise<void> {
    await this.execute(`DELETE FROM core.action_interviewer WHERE action_id = $1`, [actionId]);
    for (const userId of userIds) {
      await this.execute(
        `INSERT INTO core.action_interviewer (action_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [actionId, userId],
      );
    }
  }

  getInterviewers(actionId: string): Promise<{ user_id: string; name: string; email: string }[]> {
    return this.many<{ user_id: string; name: string; email: string }>(
      `SELECT ai.user_id, u.name, u.email
       FROM core.action_interviewer ai
       JOIN core.app_user u ON u.id = ai.user_id
       WHERE ai.action_id = $1
       ORDER BY u.name`,
      [actionId],
    );
  }
}
