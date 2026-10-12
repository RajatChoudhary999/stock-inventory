import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './config/logger';
import { apiLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/error';

import authRoutes from './modules/auth/auth.routes';
import productRoutes from './modules/products/products.routes';
import orderRoutes from './modules/orders/orders.routes';
import categoryRoutes from './modules/categories/categories.routes';
import supplierRoutes from './modules/suppliers/suppliers.routes';
import userRoutes from './modules/users/users.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import notificationRoutes from './modules/notifications/notifications.routes';

export function createApp() {
  const app = express();

  app.use(helmet()); // secure HTTP headers
  app.use(
    cors({
      origin: env.clientOrigins, // allow-list only our frontend(s)
      credentials: true, // needed for the refresh-token cookie
    }),
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api/v1', apiLimiter);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/products', productRoutes);
  app.use('/api/v1/orders', orderRoutes);
  app.use('/api/v1/categories', categoryRoutes);
  app.use('/api/v1/suppliers', supplierRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/dashboard', dashboardRoutes);
  app.use('/api/v1/notifications', notificationRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
