import { Injectable, LoggerService } from '@nestjs/common';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

@Injectable()
export class JsonLoggerService implements LoggerService {
  private readonly appName = process.env.APP_NAME ?? 'nps-agro-api';
  private readonly minLevel = (process.env.LOG_LEVEL as LogLevel | undefined) ?? 'info';

  log(message: unknown, context?: string): void {
    this.write('info', message, { context });
  }

  error(message: unknown, trace?: string, context?: string | Record<string, unknown>): void {
    const metadata =
      typeof context === 'string'
        ? { context, trace }
        : {
            ...(context ?? {}),
            trace,
          };

    this.write('error', message, metadata);
  }

  warn(message: unknown, context?: string | Record<string, unknown>): void {
    const metadata = typeof context === 'string' ? { context } : context;
    this.write('warn', message, metadata);
  }

  debug(message: unknown, context?: string | Record<string, unknown>): void {
    const metadata = typeof context === 'string' ? { context } : context;
    this.write('debug', message, metadata);
  }

  verbose(message: unknown, context?: string): void {
    this.debug(message, context);
  }

  info(message: unknown, metadata?: Record<string, unknown>): void {
    this.write('info', message, metadata);
  }

  private write(level: LogLevel, message: unknown, metadata?: Record<string, unknown>): void {
    if (LEVEL_WEIGHT[level] > LEVEL_WEIGHT[this.minLevel]) {
      return;
    }

    const payload = {
      timestamp: new Date().toISOString(),
      level,
      app: this.appName,
      message: this.normalizeMessage(message),
      ...(metadata ?? {}),
    };

    process.stdout.write(`${JSON.stringify(payload)}\n`);
  }

  private normalizeMessage(message: unknown): string {
    if (typeof message === 'string') {
      return message;
    }
    if (message instanceof Error) {
      return message.message;
    }
    return JSON.stringify(message);
  }
}
