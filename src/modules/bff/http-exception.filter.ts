import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { RequestWithContext } from '../../common/types';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
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
        code = typeof payload.error_code === 'string' ? payload.error_code : code;
        message = typeof payload.message === 'string' ? payload.message : message;
        details = payload.details;
      }
    }

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
