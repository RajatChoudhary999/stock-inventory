import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { HttpError } from '../utils/httpError';

type Source = 'body' | 'query' | 'params';

/**
 * Validates and coerces a request part against a Zod schema.
 * On success the parsed (typed) value replaces the raw one.
 */
export function validate(schema: ZodSchema, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      throw HttpError.badRequest('Validation failed', details);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any)[source] = result.data;
    next();
  };
}
