import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuditContextInterceptor } from './modules/bff/audit-context.interceptor';
import { GlobalHttpExceptionFilter } from './modules/bff/http-exception.filter';
import { RequestIdInterceptor } from './modules/bff/request-id.interceptor';
import { ResponseEnvelopeInterceptor } from './modules/bff/response-envelope.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }),
  );

  app.useGlobalInterceptors(
    new RequestIdInterceptor(),
    new ResponseEnvelopeInterceptor(),
    new AuditContextInterceptor(),
  );
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
}

void bootstrap();

