import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthUserClaims, RequestWithContext } from '../../common/types';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class TenantScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const user = request.user as AuthUserClaims | undefined;
    if (!user) {
      throw new ForbiddenException('Missing authenticated user context');
    }

    const headerTenantId = request.headers['x-tenant-id'];
    const headerTenant = Array.isArray(headerTenantId) ? headerTenantId[0] : headerTenantId;
    const candidateTenantIds = this.collectCandidateTenantIds(request);

    const roles = user.roles ?? [user.role];
    const isPlatformAdmin = roles.includes('platform_admin');

    if (!isPlatformAdmin) {
      if (headerTenant && headerTenant !== user.tenant_id) {
        throw new ForbiddenException('FORBIDDEN_TENANT_SCOPE');
      }

      for (const tenantId of candidateTenantIds) {
        if (tenantId !== user.tenant_id) {
          throw new ForbiddenException('FORBIDDEN_TENANT_SCOPE');
        }
      }

      request.effectiveTenantId = user.tenant_id;
      return true;
    }

    request.effectiveTenantId = headerTenant ?? candidateTenantIds[0] ?? user.tenant_id;
    return true;
  }

  private collectCandidateTenantIds(request: RequestWithContext): string[] {
    const values: string[] = [];

    const body = request.body as Record<string, unknown> | undefined;
    const query = request.query as Record<string, unknown>;
    const params = request.params as Record<string, unknown>;

    const pushIfString = (value: unknown) => {
      if (typeof value === 'string' && value.trim().length > 0) {
        values.push(value);
      }
    };

    pushIfString(body?.tenant_id);
    pushIfString(body?.tenantId);
    pushIfString(query?.tenant_id);
    pushIfString(query?.tenantId);
    pushIfString(params?.tenant_id);
    pushIfString(params?.tenantId);

    return values;
  }
}
