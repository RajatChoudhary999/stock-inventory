import { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@prisma/client';
import { HttpError } from '../utils/httpError';

/**
 * Role-based authorization. Use after `authenticate`.
 * Example: router.post('/', authenticate, authorize('ADMIN', 'MANAGER'), handler)
 */
export function authorize(...allowed: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw HttpError.unauthorized();
    if (!allowed.includes(req.user.role)) {
      throw HttpError.forbidden('You do not have permission to perform this action');
    }
    next();
  };
}
