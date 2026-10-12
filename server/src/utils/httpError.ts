/**
 * Typed application error. Controllers/services throw these; the central error
 * middleware turns them into consistent JSON responses with the right status.
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }

  static badRequest(msg = 'Bad request', details?: unknown) {
    return new HttpError(400, 'BAD_REQUEST', msg, details);
  }
  static unauthorized(msg = 'Unauthorized') {
    return new HttpError(401, 'UNAUTHORIZED', msg);
  }
  static forbidden(msg = 'Forbidden') {
    return new HttpError(403, 'FORBIDDEN', msg);
  }
  static notFound(msg = 'Not found') {
    return new HttpError(404, 'NOT_FOUND', msg);
  }
  static conflict(code: string, msg: string, details?: unknown) {
    return new HttpError(409, code, msg, details);
  }
}
