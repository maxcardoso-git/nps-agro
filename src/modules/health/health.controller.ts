import { Controller, Get, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../../common/database.service';
import { MetricsService } from '../../common/metrics.service';
import { Public } from '../access/public.decorator';

@Controller('health')
export class HealthController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly metricsService: MetricsService,
  ) {}

  @Public()
  @Get()
  async check() {
    const databaseOk = await this.databaseService.ping();
    const status = databaseOk ? 'ok' : 'error';

    const payload = {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      dependencies: {
        database: databaseOk ? 'ok' : 'error',
      },
      memory: {
        rss: process.memoryUsage().rss,
        heap_used: process.memoryUsage().heapUsed,
      },
      metrics: this.metricsService.snapshot(),
    };

    if (!databaseOk) {
      throw new ServiceUnavailableException({
        error_code: 'HEALTH_DATABASE_UNAVAILABLE',
        message: 'Database dependency is unavailable',
        status_code: HttpStatus.SERVICE_UNAVAILABLE,
        details: payload,
      });
    }

    return payload;
  }
}
