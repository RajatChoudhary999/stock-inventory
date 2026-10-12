import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { HttpError } from '../utils/httpError';
import type { UserRole } from '@prisma/client';

export interface AuthPayload {
  sub: number;
  role: UserRole;
  email: string;
}

// Augment Express Request with the authenticated user.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/** Verifies the Bearer access token and attaches the payload to req.user. */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw HttpError.unauthorized('Missing or malformed Authorization header');
  }
  const token = header.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, env.jwt.accessSecret) as unknown as AuthPayload;
    req.user = payload;
    next();
  } catch {
    throw HttpError.unauthorized('Invalid or expired access token');
  }
}
