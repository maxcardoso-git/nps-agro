import { Request } from 'express';
import { PlatformRole } from './constants';

export interface AuthUserClaims {
  sub: string;
  tenant_id: string;
  role: PlatformRole;
  permissions?: string[];
  email: string;
}

export interface RequestWithContext extends Request {
  user?: AuthUserClaims;
  requestId?: string;
  effectiveTenantId?: string | null;
}

export interface PaginationQuery {
  page?: number;
  page_size?: number;
}
