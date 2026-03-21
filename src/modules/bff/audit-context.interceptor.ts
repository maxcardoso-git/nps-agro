import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { RequestWithContext } from '../../common/types';

@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditContextInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - startedAt;
        this.logger.log(
          `${request.method} ${request.url} request_id=${request.requestId ?? 'n/a'} user_id=${request.user?.sub ?? 'anonymous'} tenant_id=${request.effectiveTenantId ?? request.user?.tenant_id ?? 'n/a'} latency_ms=${durationMs}`,
        );
      }),
    );
  }
}
