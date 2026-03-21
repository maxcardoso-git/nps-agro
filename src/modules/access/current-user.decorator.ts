import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUserClaims, RequestWithContext } from '../../common/types';

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUserClaims => {
  const request = ctx.switchToHttp().getRequest<RequestWithContext>();
  return request.user as AuthUserClaims;
});

export const EffectiveTenantId = createParamDecorator((_: unknown, ctx: ExecutionContext): string | null => {
  const request = ctx.switchToHttp().getRequest<RequestWithContext>();
  return request.effectiveTenantId ?? null;
});
