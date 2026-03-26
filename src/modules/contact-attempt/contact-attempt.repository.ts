import { Injectable } from '@nestjs/common';
import { SqlRepositoryBase } from '../../common/sql.repository.base';
import { DatabaseService } from '../../common/database.service';

export interface ContactAttemptRow {
  id: string;
  tenant_id: string;
  campaign_id: string;
  respondent_id: string;
  interviewer_user_id: string;
  outcome: string;
  notes: string | null;
  interview_id: string | null;
  scheduled_at: string | null;
  created_at: string;
}

export interface RespondentWithStatusRow {
  id: string;
  tenant_id: string;
  campaign_id: string;
  account_id: string | null;
  external_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  region: string | null;
  city: string | null;
  state: string | null;
  job_title: string | null;
  persona_type: string | null;
  metadata_json: Record<string, unknown>;
  account_name: string | null;
  contact_status: string;
  scheduled_at: string | null;
}

export interface ScheduledCallbackRow {
  id: string;
  respondent_id: string;
  respondent_name: string;
  respondent_phone: string | null;
  campaign_id: string;
  campaign_name: string;
  account_name: string | null;
  scheduled_at: string;
  notes: string | null;
}

@Injectable()
export class ContactAttemptRepository extends SqlRepositoryBase {
  constructor(db: DatabaseService) {
    super(db);
  }

  create(params: {
    tenant_id: string;
    campaign_id: string;
    respondent_id: string;
    interviewer_user_id: string;
    outcome: string;
    notes?: string;
    interview_id?: string;
    scheduled_at?: string;
  }): Promise<ContactAttemptRow | null> {
    return this.one<ContactAttemptRow>(
      `INSERT INTO core.contact_attempt
       (tenant_id, campaign_id, respondent_id, interviewer_user_id, outcome, notes, interview_id, scheduled_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        params.tenant_id,
        params.campaign_id,
        params.respondent_id,
        params.interviewer_user_id,
        params.outcome,
        params.notes ?? null,
        params.interview_id ?? null,
        params.scheduled_at ?? null,
      ],
    );
  }

  listRespondentsWithStatus(
    tenantId: string,
    campaignId: string,
    filters: { search?: string; status?: string; page?: number; page_size?: number },
  ): Promise<RespondentWithStatusRow[]> {
    const conditions = ['r.tenant_id = $1', 'r.campaign_id = $2'];
    const values: unknown[] = [tenantId, campaignId];
    let idx = 3;

    if (filters.search) {
      values.push(`%${filters.search}%`);
      conditions.push(`(r.name ILIKE $${idx} OR r.phone ILIKE $${idx})`);
      idx++;
    }

    const limit = filters.page_size ?? 50;
    const offset = ((filters.page ?? 1) - 1) * limit;

    // Derived status from latest contact_attempt + interview status
    let sql = `
      SELECT r.*,
        acc.name AS account_name,
        COALESCE(
          CASE
            WHEN ca.outcome = 'success' AND i.status = 'completed' THEN 'completed'
            WHEN ca.outcome = 'success' AND i.status = 'in_progress' THEN 'in_progress'
            ELSE ca.outcome
          END,
          'pending'
        ) AS contact_status,
        ca.scheduled_at
      FROM core.respondent r
      LEFT JOIN core.account acc ON acc.id = r.account_id
      LEFT JOIN LATERAL (
        SELECT outcome, interview_id, scheduled_at
        FROM core.contact_attempt
        WHERE respondent_id = r.id AND campaign_id = $2
        ORDER BY created_at DESC
        LIMIT 1
      ) ca ON true
      LEFT JOIN core.interview i ON i.id = ca.interview_id
      WHERE ${conditions.join(' AND ')}
    `;

    if (filters.status) {
      // Filter by derived status
      sql = `SELECT sub.* FROM (${sql}) sub WHERE sub.contact_status = $${idx}`;
      values.push(filters.status);
      idx++;
    }

    sql += ` ORDER BY r.name LIMIT ${limit} OFFSET ${offset}`;

    return this.many<RespondentWithStatusRow>(sql, values);
  }

  listRespondentsByAction(
    tenantId: string,
    actionId: string,
    filters: { search?: string; status?: string; page?: number; page_size?: number },
  ): Promise<RespondentWithStatusRow[]> {
    const conditions = ['r.tenant_id = $1', 'r.action_id = $2'];
    const values: unknown[] = [tenantId, actionId];
    let idx = 3;

    if (filters.search) {
      values.push(`%${filters.search}%`);
      conditions.push(`(r.name ILIKE $${idx} OR r.phone ILIKE $${idx} OR r.external_id ILIKE $${idx} OR acc.name ILIKE $${idx})`);
      idx++;
    }

    const limit = filters.page_size ?? 50;
    const offset = ((filters.page ?? 1) - 1) * limit;

    let sql = `
      SELECT r.*,
        acc.name AS account_name,
        COALESCE(
          CASE
            WHEN ca.outcome = 'success' AND i.status = 'completed' THEN 'completed'
            WHEN ca.outcome = 'success' AND i.status = 'in_progress' THEN 'in_progress'
            ELSE ca.outcome
          END,
          'pending'
        ) AS contact_status,
        ca.scheduled_at
      FROM core.respondent r
      LEFT JOIN core.account acc ON acc.id = r.account_id
      LEFT JOIN LATERAL (
        SELECT outcome, interview_id, scheduled_at
        FROM core.contact_attempt
        WHERE respondent_id = r.id AND action_id = $2
        ORDER BY created_at DESC
        LIMIT 1
      ) ca ON true
      LEFT JOIN core.interview i ON i.id = ca.interview_id
      WHERE ${conditions.join(' AND ')}
    `;

    if (filters.status) {
      sql = `SELECT sub.* FROM (${sql}) sub WHERE sub.contact_status = $${idx}`;
      values.push(filters.status);
      idx++;
    }

    sql += ` ORDER BY r.name LIMIT ${limit} OFFSET ${offset}`;

    return this.many<RespondentWithStatusRow>(sql, values);
  }

  async countRespondentsByAction(
    tenantId: string,
    actionId: string,
    filters: { search?: string; status?: string },
  ): Promise<number> {
    const conditions = ['r.tenant_id = $1', 'r.action_id = $2'];
    const values: unknown[] = [tenantId, actionId];
    let idx = 3;

    if (filters.search) {
      values.push(`%${filters.search}%`);
      conditions.push(`(r.name ILIKE $${idx} OR r.phone ILIKE $${idx} OR r.external_id ILIKE $${idx})`);
      idx++;
    }

    let sql = `
      SELECT COUNT(*) AS total FROM (
        SELECT r.id,
          COALESCE(
            CASE
              WHEN ca.outcome = 'success' AND i.status = 'completed' THEN 'completed'
              WHEN ca.outcome = 'success' AND i.status = 'in_progress' THEN 'in_progress'
              ELSE ca.outcome
            END,
            'pending'
          ) AS contact_status
        FROM core.respondent r
        LEFT JOIN LATERAL (
          SELECT outcome, interview_id FROM core.contact_attempt
          WHERE respondent_id = r.id AND action_id = $2
          ORDER BY created_at DESC LIMIT 1
        ) ca ON true
        LEFT JOIN core.interview i ON i.id = ca.interview_id
        WHERE ${conditions.join(' AND ')}
      ) sub
    `;

    if (filters.status) {
      sql += ` WHERE sub.contact_status = $${idx}`;
      values.push(filters.status);
    }

    const row = await this.one<{ total: string }>(sql, values);
    return Number(row?.total ?? 0);
  }

  createByAction(params: {
    tenant_id: string;
    action_id: string;
    campaign_id: string;
    respondent_id: string;
    interviewer_user_id: string;
    outcome: string;
    notes?: string;
    scheduled_at?: string;
  }): Promise<ContactAttemptRow | null> {
    return this.one<ContactAttemptRow>(
      `INSERT INTO core.contact_attempt
       (tenant_id, campaign_id, action_id, respondent_id, interviewer_user_id, outcome, notes, scheduled_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        params.tenant_id,
        params.campaign_id,
        params.action_id,
        params.respondent_id,
        params.interviewer_user_id,
        params.outcome,
        params.notes ?? null,
        params.scheduled_at ?? null,
      ],
    );
  }

  async getCampaignContactStats(tenantId: string, campaignId: string) {
    return this.many<{ status: string; count: number }>(
      `SELECT contact_status AS status, COUNT(*)::int AS count
       FROM (
         SELECT
           COALESCE(
             CASE
               WHEN ca.outcome = 'success' AND i.status = 'completed' THEN 'completed'
               WHEN ca.outcome = 'success' AND i.status = 'in_progress' THEN 'in_progress'
               ELSE ca.outcome
             END,
             'pending'
           ) AS contact_status
         FROM core.respondent r
         LEFT JOIN LATERAL (
           SELECT outcome, interview_id
           FROM core.contact_attempt
           WHERE respondent_id = r.id AND campaign_id = $2
           ORDER BY created_at DESC LIMIT 1
         ) ca ON true
         LEFT JOIN core.interview i ON i.id = ca.interview_id
         WHERE r.campaign_id = $2 AND r.tenant_id = $1
       ) sub
       GROUP BY contact_status
       ORDER BY count DESC`,
      [tenantId, campaignId],
    );
  }

  async getCampaignIdForAction(actionId: string, tenantId: string): Promise<string | null> {
    const row = await this.one<{ campaign_id: string }>(
      `SELECT campaign_id FROM core.campaign_action WHERE id = $1 AND tenant_id = $2`,
      [actionId, tenantId],
    );
    return row?.campaign_id ?? null;
  }

  getScheduledCallbacks(
    tenantId: string,
    interviewerUserId: string,
    date?: string,
  ): Promise<ScheduledCallbackRow[]> {
    const targetDate = date ?? new Date().toISOString().split('T')[0];

    return this.many<ScheduledCallbackRow>(
      `SELECT ca.id, ca.respondent_id, r.name AS respondent_name, r.phone AS respondent_phone,
              ca.campaign_id, c.name AS campaign_name, acc.name AS account_name,
              ca.scheduled_at, ca.notes
       FROM core.contact_attempt ca
       JOIN core.respondent r ON r.id = ca.respondent_id
       JOIN core.campaign c ON c.id = ca.campaign_id
       LEFT JOIN core.account acc ON acc.id = r.account_id
       WHERE ca.tenant_id = $1
         AND ca.interviewer_user_id = $2
         AND ca.outcome = 'scheduled'
         AND ca.scheduled_at::date = $3::date
         AND NOT EXISTS (
           SELECT 1 FROM core.contact_attempt newer
           WHERE newer.respondent_id = ca.respondent_id
             AND newer.campaign_id = ca.campaign_id
             AND newer.created_at > ca.created_at
         )
       ORDER BY ca.scheduled_at`,
      [tenantId, interviewerUserId, targetDate],
    );
  }

  // Reserve the next available contact for an interviewer (FIFO queue)
  async reserveNextContact(
    tenantId: string,
    actionId: string,
    userId: string,
    reservationMinutes: number = 30,
  ): Promise<RespondentWithStatusRow | null> {
    // Release expired reservations first
    await this.execute(
      `UPDATE core.respondent
       SET reserved_by = NULL, reserved_at = NULL
       WHERE action_id = $1 AND reserved_at < NOW() - INTERVAL '1 minute' * $2`,
      [actionId, reservationMinutes],
    );

    // Find next unreserved pending contact
    // Uses subquery to avoid FOR UPDATE on outer join
    const row = await this.one<{ id: string }>(
      `SELECT r.id
       FROM core.respondent r
       WHERE r.action_id = $1
         AND r.tenant_id = $2
         AND (r.reserved_by IS NULL OR r.reserved_by = $3)
         AND NOT EXISTS (
           SELECT 1 FROM core.interview i
           WHERE i.respondent_id = r.id AND i.action_id = $1 AND i.status = 'completed'
         )
         AND NOT EXISTS (
           SELECT 1 FROM core.contact_attempt ca
           WHERE ca.respondent_id = r.id AND ca.action_id = $1
             AND ca.outcome NOT IN ('no_answer', 'busy')
         )
       ORDER BY r.created_at
       LIMIT 1
       FOR UPDATE OF r SKIP LOCKED`,
      [actionId, tenantId, userId],
    );

    if (!row) return null;

    // Reserve it
    await this.execute(
      `UPDATE core.respondent SET reserved_by = $1, reserved_at = NOW() WHERE id = $2`,
      [userId, row.id],
    );

    // Return full respondent with status
    const result = await this.one<RespondentWithStatusRow>(
      `SELECT r.*,
        acc.name AS account_name,
        'pending' AS contact_status,
        NULL::timestamp AS scheduled_at
       FROM core.respondent r
       LEFT JOIN core.account acc ON acc.id = r.account_id
       WHERE r.id = $1`,
      [row.id],
    );

    return result;
  }

  async releaseReservation(respondentId: string, userId: string): Promise<void> {
    await this.execute(
      `UPDATE core.respondent SET reserved_by = NULL, reserved_at = NULL WHERE id = $1 AND reserved_by = $2`,
      [respondentId, userId],
    );
  }
}
