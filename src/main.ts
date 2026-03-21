import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadAndValidateEnv } from './common/env';
import { JsonLoggerService } from './common/json-logger.service';
import { AuditContextInterceptor } from './modules/bff/audit-context.interceptor';
import { GlobalHttpExceptionFilter } from './modules/bff/http-exception.filter';
import { RequestIdInterceptor } from './modules/bff/request-id.interceptor';
import { ResponseEnvelopeInterceptor } from './modules/bff/response-envelope.interceptor';
import helmet from 'helmet';

async function bootstrap(): Promise<void> {
  const env = loadAndValidateEnv();
  const app = await NestFactory.create(AppModule, { logger: false });
  const logger = app.get(JsonLoggerService);
  app.useLogger(logger);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }),
  );

  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
    credentials: true,
  });

  app.useGlobalInterceptors(
    app.get(RequestIdInterceptor),
    app.get(ResponseEnvelopeInterceptor),
    app.get(AuditContextInterceptor),
  );
  app.useGlobalFilters(app.get(GlobalHttpExceptionFilter));

  await app.listen(env.PORT);
  logger.info('APPLICATION_STARTED', {
    port: env.PORT,
    node_env: env.NODE_ENV,
  });
}

void bootstrap();
