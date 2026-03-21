import { config } from 'dotenv';

export type AppEnv = {
  NODE_ENV: 'development' | 'production';
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  APP_NAME: string;
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
};

const LOG_LEVELS = ['error', 'warn', 'info', 'debug'] as const;

export function loadAndValidateEnv(): AppEnv {
  const runtimeNodeEnv = process.env.NODE_ENV === 'production' ? 'production' : 'development';

  config({ path: `.env.${runtimeNodeEnv}` });
  config({ path: '.env' });

  const errors: string[] = [];
  const nodeEnv = process.env.NODE_ENV === 'production' ? 'production' : 'development';
  const portRaw = process.env.PORT ?? '3000';
  const jwtSecret = process.env.JWT_SECRET ?? '';
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN ?? '3600s';
  const appName = process.env.APP_NAME ?? 'nps-agro-api';
  const logLevelRaw = process.env.LOG_LEVEL ?? 'info';
  const databaseUrl = process.env.DATABASE_URL ?? '';

  const port = Number(portRaw);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    errors.push('PORT must be a valid TCP port');
  }

  if (!databaseUrl || !databaseUrl.startsWith('postgresql://')) {
    errors.push('DATABASE_URL is required and must start with postgresql://');
  }

  if (jwtSecret.length < 32) {
    errors.push('JWT_SECRET must have at least 32 characters');
  }

  if (!jwtExpiresIn || jwtExpiresIn.trim().length === 0) {
    errors.push('JWT_EXPIRES_IN is required');
  }

  if (!LOG_LEVELS.includes(logLevelRaw as (typeof LOG_LEVELS)[number])) {
    errors.push('LOG_LEVEL must be one of: error, warn, info, debug');
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${errors.join('; ')}`);
  }

  return {
    NODE_ENV: nodeEnv,
    PORT: port,
    DATABASE_URL: databaseUrl,
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: jwtExpiresIn,
    APP_NAME: appName,
    LOG_LEVEL: logLevelRaw as AppEnv['LOG_LEVEL'],
  };
}
