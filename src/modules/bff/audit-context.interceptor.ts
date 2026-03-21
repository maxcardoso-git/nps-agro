import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { JsonLoggerService } from '../../common/json-logger.service';
import { MetricsService } from '../../common/metrics.service';
import { RequestWithContext } from '../../common/types';

@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: JsonLoggerService,
    private readonly metricsService: MetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithContext>();
    const response = http.getResponse<{ statusCode?: number }>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startedAt;
          this.metricsService.recordRequest(durationMs);

          const statusCode = response.statusCode ?? 200;
          const basePayload = {
            request_id: request.requestId ?? null,
            path: request.path,
            method: request.method,
            status_code: statusCode,
            tenant_id: request.effectiveTenantId ?? request.user?.tenant_id ?? null,
            user_id: request.user?.sub ?? null,
            latency_ms: durationMs,
          };

          if (statusCode >= 500) {
            this.metricsService.recordError();
            this.logger.error('HTTP_REQUEST_FAILED', undefined, basePayload);
            return;
          }

          if (statusCode >= 400) {
            this.logger.warn('HTTP_REQUEST_WARNING', basePayload);
            return;
          }

          this.logger.info('HTTP_REQUEST_COMPLETED', basePayload);
        },
        error: (error: unknown) => {
          const durationMs = Date.now() - startedAt;
          this.metricsService.recordRequest(durationMs);
          this.metricsService.recordError();

          this.logger.error(
            'HTTP_REQUEST_FAILED',
            error instanceof Error ? error.stack : undefined,
            {
              request_id: request.requestId ?? null,
              path: request.path,
              method: request.method,
              status_code: response.statusCode ?? 500,
              tenant_id: request.effectiveTenantId ?? request.user?.tenant_id ?? null,
              user_id: request.user?.sub ?? null,
              latency_ms: durationMs,
            },
          );
        },
      }),
    );
  }
}
