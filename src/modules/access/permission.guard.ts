import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLE_PERMISSIONS, hasPermission } from '../../common/role-permissions';
import { AuthUserClaims, RequestWithContext } from '../../common/types';
import { IS_PUBLIC_KEY } from './public.decorator';
import { PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const required =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const user = request.user as AuthUserClaims | undefined;

    if (!user) {
      throw new ForbiddenException('Missing authenticated user context');
    }

    // Aggregate permissions from all roles (multi-role support)
    const roles = user.roles ?? [user.role];
    const permissions = user.permissions ??
      Array.from(new Set(roles.flatMap((r) => ROLE_PERMISSIONS[r] ?? [])));
    const allowed = required.every((permission) => hasPermission(permissions, permission));

    if (!allowed) {
      throw new ForbiddenException('Insufficient permission');
    }

    return true;
  }
}
