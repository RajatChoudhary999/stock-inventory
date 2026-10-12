import { NextFunction, Request, Response } from 'express';
import { HttpError } from '../utils/httpError';
import { logger } from '../config/logger';

/** 404 for unmatched routes. */
export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(HttpError.notFound('Route not found'));
}

/** Central error handler — the only place that formats error responses. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }
  // Unknown/unexpected error: log details server-side, return a generic message.
  logger.error({ err }, 'Unhandled error');
  return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Something went wrong' });
}
