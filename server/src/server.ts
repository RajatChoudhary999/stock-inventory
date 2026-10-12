import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/prisma';

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info(`StockFlow API running on http://localhost:${env.port} (${env.nodeEnv})`);
});

// Graceful shutdown — close HTTP server and DB pool.
async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
