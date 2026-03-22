import { REQUEST_ID_HEADER } from '@/lib/auth/constants';
import type {
  AuthSession,
  Campaign,
  ContactAttempt,
  InterviewRecord,
  PaginatedResponse,
  RespondentWithStatus,
  ScheduledCallback,
  SurveyRuntimeResponse,
  Tenant
} from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function toQueryString(query?: Record<string, string | number | boolean | undefined>): string {
  if (!query) return '';
  const search = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const raw = search.toString();
  return raw ? `?${raw}` : '';
}

function unwrapEnvelope<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'success' in payload &&
    typeof (payload as { success?: boolean }).success === 'boolean'
  ) {
    const envelope = payload as {
      success: boolean;
      data?: T;
      error?: { code?: string; message?: string; details?: unknown };
    };
    if (!envelope.success) {
      throw new ApiError(
        envelope.error?.message || 'Request failed',
        envelope.error?.code || 'API_ERROR',
        400,
        envelope.error?.details
      );
    }
    return (envelope.data || ({} as T)) as T;
  }
  return payload as T;
}

function createRequestId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  session?: AuthSession | null,
  tenantIdOverride?: string
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set(REQUEST_ID_HEADER, createRequestId());

  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
    headers.set('x-tenant-id', tenantIdOverride || session.user.tenant_id);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    cache: 'no-store'
  });

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    const code = body?.error?.code || body?.code || 'API_ERROR';
    const message = body?.error?.message || body?.message || response.statusText;
    throw new ApiError(message, code, response.status, body?.error?.details);
  }

  return unwrapEnvelope<T>(body);
}

function extractItems<T>(data: T[] | PaginatedResponse<T> | undefined | null): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if ('items' in data) return data.items;
  return [];
}

export { extractItems };

export const api = {
  auth: {
    login: async (payload: { email: string; password: string }): Promise<AuthSession> => {
      return request<AuthSession>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    me: async (session: AuthSession): Promise<{ user: AuthSession['user'] }> => {
      return request<{ user: AuthSession['user'] }>('/auth/me', { method: 'GET' }, session);
    }
  },
  tenants: {
    getById: async (session: AuthSession, tenantId: string): Promise<Tenant> => {
      return request<Tenant>(`/tenants/${tenantId}`, { method: 'GET' }, session, tenantId);
    }
  },
  campaigns: {
    list: async (
      session: AuthSession,
      query?: Record<string, string | number | boolean | undefined>
    ): Promise<Campaign[] | PaginatedResponse<Campaign>> => {
      return request<Campaign[] | PaginatedResponse<Campaign>>(
        `/campaigns${toQueryString(query)}`,
        { method: 'GET' },
        session
      );
    },
    getRespondents: async (
      session: AuthSession,
      campaignId: string,
      query?: Record<string, string | number | boolean | undefined>
    ): Promise<RespondentWithStatus[]> => {
      return request<RespondentWithStatus[]>(
        `/campaigns/${campaignId}/respondents${toQueryString(query)}`,
        { method: 'GET' },
        session
      );
    }
  },
  actions: {
    list: async (
      session: AuthSession,
      campaignId: string
    ): Promise<{ id: string; campaign_id: string; name: string; description: string | null; questionnaire_version_id: string; status: string; questionnaire_name: string | null; respondent_count: number; interviewer_count: number; start_date: string | null; end_date: string | null }[]> => {
      return request<never[]>(
        `/campaigns/${campaignId}/actions`,
        { method: 'GET' },
        session
      );
    },
    getRespondents: async (
      session: AuthSession,
      actionId: string,
      query?: Record<string, string | number | boolean | undefined>
    ): Promise<RespondentWithStatus[]> => {
      return request<RespondentWithStatus[]>(
        `/actions/${actionId}/respondents${toQueryString(query)}`,
        { method: 'GET' },
        session
      );
    }
  },
  contactAttempts: {
    create: async (
      session: AuthSession,
      campaignId: string,
      respondentId: string,
      payload: { outcome: string; notes?: string; scheduled_at?: string }
    ): Promise<ContactAttempt> => {
      return request<ContactAttempt>(
        `/campaigns/${campaignId}/respondents/${respondentId}/contact-attempts`,
        { method: 'POST', body: JSON.stringify(payload) },
        session
      );
    },
    createByAction: async (
      session: AuthSession,
      actionId: string,
      respondentId: string,
      payload: { outcome: string; notes?: string; scheduled_at?: string }
    ): Promise<ContactAttempt> => {
      return request<ContactAttempt>(
        `/actions/${actionId}/respondents/${respondentId}/contact-attempts`,
        { method: 'POST', body: JSON.stringify(payload) },
        session
      );
    },
    getMyScheduled: async (
      session: AuthSession,
      date?: string
    ): Promise<ScheduledCallback[]> => {
      return request<ScheduledCallback[]>(
        `/contact-attempts/my-scheduled${toQueryString({ date })}`,
        { method: 'GET' },
        session
      );
    }
  },
  interviews: {
    findActive: async (
      session: AuthSession,
      campaignId: string,
      respondentId: string
    ): Promise<InterviewRecord | null> => {
      try {
        return await request<InterviewRecord>(
          `/interviews/active${toQueryString({
            tenant_id: session.user.tenant_id,
            campaign_id: campaignId,
            respondent_id: respondentId
          })}`,
          { method: 'GET' },
          session
        );
      } catch {
        return null;
      }
    },
    start: async (
      session: AuthSession,
      payload: { tenant_id: string; campaign_id: string; action_id?: string; respondent_id: string; channel?: string; interviewer_user_id?: string }
    ): Promise<SurveyRuntimeResponse> => {
      return request<SurveyRuntimeResponse>(
        '/interviews/start',
        { method: 'POST', body: JSON.stringify(payload) },
        session,
        payload.tenant_id
      );
    },
    answer: async (
      session: AuthSession,
      interviewId: string,
      payload: { tenant_id: string; question_id: string; value: unknown }
    ): Promise<SurveyRuntimeResponse> => {
      return request<SurveyRuntimeResponse>(
        `/interviews/${interviewId}/answer`,
        { method: 'POST', body: JSON.stringify(payload) },
        session
      );
    },
    next: async (
      session: AuthSession,
      interviewId: string,
      tenantId: string
    ): Promise<SurveyRuntimeResponse> => {
      return request<SurveyRuntimeResponse>(
        `/interviews/${interviewId}/next${toQueryString({ tenant_id: tenantId })}`,
        { method: 'GET' },
        session
      );
    },
    complete: async (
      session: AuthSession,
      interviewId: string,
      tenantId: string
    ): Promise<SurveyRuntimeResponse> => {
      return request<SurveyRuntimeResponse>(
        `/interviews/${interviewId}/complete`,
        { method: 'POST', body: JSON.stringify({ tenant_id: tenantId }) },
        session
      );
    }
  }
};
