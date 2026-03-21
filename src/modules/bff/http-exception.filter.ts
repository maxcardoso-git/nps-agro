import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { JsonLoggerService } from '../../common/json-logger.service';
import { RequestWithContext } from '../../common/types';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: JsonLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{ status: (statusCode: number) => { json: (body: unknown) => void } }>();
    const request = ctx.getRequest<RequestWithContext>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'Unexpected error';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse() as Record<string, unknown> | string;

      if (typeof payload === 'string') {
        message = payload;
      } else {
        if (typeof payload.code === 'string') {
          code = payload.code;
        }
        code = typeof payload.error_code === 'string' ? payload.error_code : code;
        if (typeof payload.message === 'string') {
          message = payload.message;
        } else if (Array.isArray(payload.message)) {
          message = payload.message.join('; ');
        }
        details = payload.details;
      }
    }

    const trace = exception instanceof Error ? exception.stack : undefined;
    this.logger.error(
      'HTTP_EXCEPTION',
      trace,
      {
        request_id: request.requestId ?? null,
        path: request.path,
        method: request.method,
        status_code: status,
        tenant_id: request.effectiveTenantId ?? request.user?.tenant_id ?? null,
        user_id: request.user?.sub ?? null,
        code,
      },
    );

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        details,
      },
      meta: {
        request_id: request.requestId ?? null,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
