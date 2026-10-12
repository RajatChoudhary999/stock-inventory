import 'dotenv/config';

/**
 * Centralized, validated environment config.
 * Fail fast at startup if a required secret is missing — never ship with defaults.
 */
function required(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT ?? 4000),
  clientOrigins: (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim()),
  databaseUrl: required('DATABASE_URL'),
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
    refreshTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7),
  },
};
