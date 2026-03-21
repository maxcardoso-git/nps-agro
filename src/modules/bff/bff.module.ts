import { Module } from '@nestjs/common';
import { AuditContextInterceptor } from './audit-context.interceptor';
import { GlobalHttpExceptionFilter } from './http-exception.filter';
import { RequestIdInterceptor } from './request-id.interceptor';
import { ResponseEnvelopeInterceptor } from './response-envelope.interceptor';

@Module({
  providers: [
    RequestIdInterceptor,
    ResponseEnvelopeInterceptor,
    AuditContextInterceptor,
    GlobalHttpExceptionFilter,
  ],
  exports: [
    RequestIdInterceptor,
    ResponseEnvelopeInterceptor,
    AuditContextInterceptor,
    GlobalHttpExceptionFilter,
  ],
})
export class BffModule {}
