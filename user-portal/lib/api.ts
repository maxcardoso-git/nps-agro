import { REQUEST_ID_HEADER } from '@/lib/auth/constants';
import type {
  AuthSession,
  Campaign,
  ExecutiveSummary,
  InterviewSummary,
  PaginatedResponse,
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
  if (!query) {
    return '';
  }

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
      error?: {
        code?: string;
        message?: string;
        details?: unknown;
      };
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

export const api = {
  auth: {
    login: async (payload: {
      email: string;
      password: string;
      tenant_code?: string;
    }): Promise<AuthSession> => {
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
    campaignInterviews: async (
      session: AuthSession,
      campaignId: string,
      query?: {
        region?: string;
        sentiment?: string;
        nps_class?: string;
        page?: number;
        page_size?: number;
      }
    ): Promise<InterviewSummary[] | PaginatedResponse<InterviewSummary>> => {
      return request<InterviewSummary[] | PaginatedResponse<InterviewSummary>>(
        `/reports/campaigns/${campaignId}/interviews${toQueryString(query)}`,
        { method: 'GET' },
        session
      );
    }
  }
};
