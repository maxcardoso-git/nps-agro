import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { RequestWithContext } from '../../common/types';

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithContext>();

    return next.handle().pipe(
      map((data: unknown) => {
        if (request.path === '/health') {
          return data;
        }

        if (
          typeof data === 'object' &&
          data !== null &&
          'success' in (data as Record<string, unknown>)
        ) {
          return data;
        }

        return {
          success: true,
          data,
          meta: {
            request_id: request.requestId ?? null,
            timestamp: new Date().toISOString(),
          },
        };
      }),
    );
  }
}
