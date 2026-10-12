import pino from 'pino';
import { env } from './env';

// Pino logger configuration (structured logs across environments).
export const logger = pino({
  level: env.isProd ? 'info' : 'debug',
});

