import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from './constants';
import { DatabaseService } from './database.service';
import { JsonLoggerService } from './json-logger.service';
import { MetricsService } from './metrics.service';

@Global()
@Module({
  providers: [
    {
      provide: DB_POOL,
      useFactory: () =>
        new Pool({
          connectionString: process.env.DATABASE_URL,
          max: process.env.DB_POOL_MAX ? Number(process.env.DB_POOL_MAX) : 20,
        }),
    },
    DatabaseService,
    JsonLoggerService,
    MetricsService,
  ],
  exports: [DB_POOL, DatabaseService, JsonLoggerService, MetricsService],
})
export class DatabaseModule {}
