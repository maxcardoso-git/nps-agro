import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private requestCount = 0;
  private errorCount = 0;
  private responseTimeTotalMs = 0;

  recordRequest(durationMs: number): void {
    this.requestCount += 1;
    this.responseTimeTotalMs += Math.max(0, durationMs);
  }

  recordError(): void {
    this.errorCount += 1;
  }

  snapshot(): {
    request_count: number;
    error_count: number;
    error_rate: number;
    avg_response_time_ms: number;
  } {
    const errorRate = this.requestCount === 0 ? 0 : Number((this.errorCount / this.requestCount).toFixed(4));
    const avgResponse =
      this.requestCount === 0 ? 0 : Number((this.responseTimeTotalMs / this.requestCount).toFixed(2));

    return {
      request_count: this.requestCount,
      error_count: this.errorCount,
      error_rate: errorRate,
      avg_response_time_ms: avgResponse,
    };
  }
}
