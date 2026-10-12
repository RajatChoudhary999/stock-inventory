import { PrismaClient } from '@prisma/client';
import { env } from './env';

// Single shared Prisma client (avoid exhausting DB connections by re-instantiating).
export const prisma = new PrismaClient({
  log: env.isProd ? ['error'] : ['warn', 'error'],
});
