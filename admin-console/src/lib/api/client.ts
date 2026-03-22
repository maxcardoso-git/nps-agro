import { REQUEST_ID_HEADER } from '@/lib/auth/constants';
import type {
  AnswerQuestionRequest,
  AnswerQuestionResponse,
  AuthSession,
  Campaign,
  ExecutiveSummary,
  NextQuestionResponse,
  PaginatedResponse,
  Questionnaire,
  QuestionnaireVersion,
  ReportFilters,
  StartInterviewRequest,
  StartInterviewResponse,
  Tenant,
  TenantUser
} from '@/lib/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, code = 'API_ERROR', status = 500, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function createRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function unwrap<T>(payload: unknown): T {
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

function toQueryString(query?: Record<string, string | number | boolean | undefined>): string {
  if (!query) {
    return '';
  }

  const search = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });

  const encoded = search.toString();
  return encoded ? `?${encoded}` : '';
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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    cache: 'no-store'
  });

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    const message =
      body?.error?.message || body?.message || response.statusText || 'Unexpected API error';
    const code = body?.error?.code || body?.code || 'API_ERROR';
    throw new ApiError(message, code, response.status, body?.error?.details);
  }

  return unwrap<T>(body);
}

export const apiClient = {
  auth: {
    login: async (input: {
      email: string;
      password: string;
      tenant_code?: string;
    }): Promise<AuthSession> => {
      return request<AuthSession>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(input)
      });
    },
    me: async (session: AuthSession): Promise<{ user: AuthSession['user'] }> => {
      return request<{ user: AuthSession['user'] }>('/auth/me', { method: 'GET' }, session);
    }
  },
  tenants: {
    list: async (
      session: AuthSession,
      filters?: Record<string, string | number | boolean | undefined>
    ): Promise<PaginatedResponse<Tenant> | Tenant[]> => {
      return request<PaginatedResponse<Tenant> | Tenant[]>(
        `/tenants${toQueryString(filters)}`,
        { method: 'GET' },
        session
      );
    },
    getById: async (session: AuthSession, tenantId: string): Promise<Tenant> => {
      return request<Tenant>(`/tenants/${tenantId}`, { method: 'GET' }, session, tenantId);
    },
    create: async (session: AuthSession, payload: Partial<Tenant>): Promise<Tenant> => {
      return request<Tenant>(
        '/tenants',
        { method: 'POST', body: JSON.stringify(payload) },
        session
      );
    },
    update: async (
      session: AuthSession,
      tenantId: string,
      payload: Partial<Tenant>
    ): Promise<Tenant> => {
      return request<Tenant>(
        `/tenants/${tenantId}`,
        { method: 'PATCH', body: JSON.stringify(payload) },
        session,
        tenantId
      );
    }
  },
  users: {
    listByTenant: async (session: AuthSession, tenantId: string): Promise<TenantUser[]> => {
      return request<TenantUser[]>(`/tenants/${tenantId}/users`, { method: 'GET' }, session, tenantId);
    },
    create: async (
      session: AuthSession,
      tenantId: string,
      payload: {
        name: string;
        email: string;
        password: string;
        role: string;
        is_active?: boolean;
      }
    ): Promise<TenantUser> => {
      return request<TenantUser>(
        `/tenants/${tenantId}/users`,
        { method: 'POST', body: JSON.stringify(payload) },
        session,
        tenantId
      );
    },
    update: async (
      session: AuthSession,
      tenantId: string,
      userId: string,
      payload: Partial<{
        name: string;
        role: string;
        is_active: boolean;
        password: string;
      }>
    ): Promise<TenantUser> => {
      return request<TenantUser>(
        `/tenants/${tenantId}/users/${userId}`,
        { method: 'PATCH', body: JSON.stringify(payload) },
        session,
        tenantId
      );
    },
    getRoles: async (session: AuthSession, tenantId: string, userId: string): Promise<string[]> => {
      return request<string[]>(
        `/tenants/${tenantId}/users/${userId}/roles`,
        { method: 'GET' },
        session,
        tenantId
      );
    },
    setRoles: async (session: AuthSession, tenantId: string, userId: string, roles: string[]): Promise<string[]> => {
      return request<string[]>(
        `/tenants/${tenantId}/users/${userId}/roles`,
        { method: 'PATCH', body: JSON.stringify({ roles }) },
        session,
        tenantId
      );
    }
  },
  campaigns: {
    list: async (
      session: AuthSession,
      filters?: Record<string, string | number | boolean | undefined>
    ): Promise<PaginatedResponse<Campaign> | Campaign[]> => {
      return request<PaginatedResponse<Campaign> | Campaign[]>(
        `/campaigns${toQueryString(filters)}`,
        { method: 'GET' },
        session
      );
    },
    getById: async (session: AuthSession, campaignId: string): Promise<Campaign> => {
      return request<Campaign>(`/campaigns/${campaignId}`, { method: 'GET' }, session);
    },
    create: async (session: AuthSession, payload: Partial<Campaign>): Promise<Campaign> => {
      return request<Campaign>(
        '/campaigns',
        { method: 'POST', body: JSON.stringify(payload) },
        session
      );
    },
    update: async (
      session: AuthSession,
      campaignId: string,
      payload: Partial<Campaign>
    ): Promise<Campaign> => {
      return request<Campaign>(
        `/campaigns/${campaignId}`,
        { method: 'PATCH', body: JSON.stringify(payload) },
        session
      );
    },
    activate: async (session: AuthSession, campaignId: string): Promise<Campaign> => {
      return request<Campaign>(`/campaigns/${campaignId}/activate`, { method: 'POST' }, session);
    },
    pause: async (session: AuthSession, campaignId: string): Promise<Campaign> => {
      return request<Campaign>(`/campaigns/${campaignId}/pause`, { method: 'POST' }, session);
    },
    complete: async (session: AuthSession, campaignId: string): Promise<Campaign> => {
      return request<Campaign>(`/campaigns/${campaignId}/complete`, { method: 'POST' }, session);
    }
  },
  questionnaires: {
    list: async (
      session: AuthSession,
      filters?: Record<string, string | number | boolean | undefined>
    ): Promise<PaginatedResponse<Questionnaire> | Questionnaire[]> => {
      return request<PaginatedResponse<Questionnaire> | Questionnaire[]>(
        `/questionnaires${toQueryString(filters)}`,
        { method: 'GET' },
        session
      );
    },
    getById: async (
      session: AuthSession,
      questionnaireId: string
    ): Promise<Questionnaire & { versions?: QuestionnaireVersion[] }> => {
      return request<Questionnaire & { versions?: QuestionnaireVersion[] }>(
        `/questionnaires/${questionnaireId}`,
        { method: 'GET' },
        session
      );
    },
    create: async (
      session: AuthSession,
      payload: Partial<Questionnaire>
    ): Promise<Questionnaire> => {
      return request<Questionnaire>(
        '/questionnaires',
        { method: 'POST', body: JSON.stringify(payload) },
        session
      );
    },
    createVersion: async (
      session: AuthSession,
      questionnaireId: string,
      payload: { schema_json: Record<string, unknown> }
    ): Promise<QuestionnaireVersion> => {
      return request<QuestionnaireVersion>(
        `/questionnaires/${questionnaireId}/versions`,
        { method: 'POST', body: JSON.stringify(payload) },
        session
      );
    },
    updateDraftVersion: async (
      session: AuthSession,
      versionId: string,
      payload: { schema_json: Record<string, unknown>; status?: 'draft' }
    ): Promise<QuestionnaireVersion> => {
      return request<QuestionnaireVersion>(
        `/questionnaire-versions/${versionId}`,
        { method: 'PATCH', body: JSON.stringify(payload) },
        session
      );
    },
    validateVersion: async (session: AuthSession, versionId: string): Promise<{ valid: boolean }> => {
      return request<{ valid: boolean }>(
        `/questionnaire-versions/${versionId}/validate`,
        { method: 'POST' },
        session
      );
    },
    publishVersion: async (session: AuthSession, versionId: string): Promise<QuestionnaireVersion> => {
      return request<QuestionnaireVersion>(
        `/questionnaire-versions/${versionId}/publish`,
        { method: 'POST' },
        session
      );
    }
  },
  reports: {
    executiveSummary: async (session: AuthSession, campaignId: string): Promise<ExecutiveSummary> => {
      return request<ExecutiveSummary>(
        `/reports/campaigns/${campaignId}/executive-summary`,
        { method: 'GET' },
        session
      );
    },
    listInterviews: async (
      session: AuthSession,
      campaignId: string,
      filters?: ReportFilters
    ): Promise<PaginatedResponse<unknown> | unknown[]> => {
      return request<PaginatedResponse<unknown> | unknown[]>(
        `/reports/campaigns/${campaignId}/interviews${toQueryString(
          filters as Record<string, string | number | boolean | undefined>
        )}`,
        { method: 'GET' },
        session
      );
    }
  },
  campaignActions: {
    list: async (session: AuthSession, campaignId: string) => {
      return request<unknown[]>(`/campaigns/${campaignId}/actions`, { method: 'GET' }, session);
    },
    create: async (session: AuthSession, campaignId: string, payload: { name: string; description?: string; questionnaire_version_id: string; start_date?: string; end_date?: string }) => {
      return request<unknown>(`/campaigns/${campaignId}/actions`, { method: 'POST', body: JSON.stringify(payload) }, session);
    },
    update: async (session: AuthSession, campaignId: string, actionId: string, payload: Record<string, unknown>) => {
      return request<unknown>(`/campaigns/${campaignId}/actions/${actionId}`, { method: 'PATCH', body: JSON.stringify(payload) }, session);
    },
    activate: async (session: AuthSession, campaignId: string, actionId: string) => {
      return request<unknown>(`/campaigns/${campaignId}/actions/${actionId}/activate`, { method: 'POST' }, session);
    },
    pause: async (session: AuthSession, campaignId: string, actionId: string) => {
      return request<unknown>(`/campaigns/${campaignId}/actions/${actionId}/pause`, { method: 'POST' }, session);
    },
    setInterviewers: async (session: AuthSession, campaignId: string, actionId: string, userIds: string[]) => {
      return request<unknown>(`/campaigns/${campaignId}/actions/${actionId}/interviewers`, { method: 'PUT', body: JSON.stringify({ user_ids: userIds }) }, session);
    },
    getInterviewers: async (session: AuthSession, campaignId: string, actionId: string) => {
      return request<{ user_id: string; name: string; email: string }[]>(`/campaigns/${campaignId}/actions/${actionId}/interviewers`, { method: 'GET' }, session);
    },
    getRespondents: async (
      session: AuthSession,
      actionId: string,
      filters?: Record<string, string | number | boolean | undefined>
    ): Promise<unknown[]> => {
      return request<unknown[]>(
        `/actions/${actionId}/respondents${toQueryString(filters)}`,
        { method: 'GET' },
        session
      );
    },
  },
  accounts: {
    list: async (
      session: AuthSession,
      filters?: Record<string, string | number | boolean | undefined>
    ): Promise<{ id: string; tenant_id: string; name: string; respondent_count: number; created_at: string }[]> => {
      return request<{ id: string; tenant_id: string; name: string; respondent_count: number; created_at: string }[]>(
        `/accounts${toQueryString(filters)}`,
        { method: 'GET' },
        session
      );
    },
    create: async (
      session: AuthSession,
      payload: { tenant_id?: string; name: string }
    ): Promise<{ id: string; name: string }> => {
      return request<{ id: string; name: string }>(
        '/accounts',
        { method: 'POST', body: JSON.stringify(payload) },
        session
      );
    },
    update: async (
      session: AuthSession,
      accountId: string,
      payload: { name?: string }
    ): Promise<{ id: string; name: string }> => {
      return request<{ id: string; name: string }>(
        `/accounts/${accountId}`,
        { method: 'PATCH', body: JSON.stringify(payload) },
        session
      );
    }
  },
  interviews: {
    start: async (session: AuthSession, payload: StartInterviewRequest): Promise<StartInterviewResponse> => {
      return request<StartInterviewResponse>(
        '/interviews/start',
        { method: 'POST', body: JSON.stringify(payload) },
        session,
        payload.tenant_id
      );
    },
    answer: async (
      session: AuthSession,
      interviewId: string,
      payload: AnswerQuestionRequest
    ): Promise<AnswerQuestionResponse> => {
      return request<AnswerQuestionResponse>(
        `/interviews/${interviewId}/answer`,
        { method: 'POST', body: JSON.stringify(payload) },
        session
      );
    },
    next: async (session: AuthSession, interviewId: string): Promise<NextQuestionResponse> => {
      return request<NextQuestionResponse>(`/interviews/${interviewId}/next`, { method: 'GET' }, session);
    },
    complete: async (
      session: AuthSession,
      interviewId: string
    ): Promise<{ interview_id: string; completed: boolean }> => {
      return request<{ interview_id: string; completed: boolean }>(
        `/interviews/${interviewId}/complete`,
        { method: 'POST' },
        session
      );
    }
  }
};
