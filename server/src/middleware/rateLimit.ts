import rateLimit from 'express-rate-limit';

/** Stricter limit on auth endpoints to slow brute-force / credential stuffing. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'RATE_LIMITED', message: 'Too many attempts, please try again later' },
});

/** General API limiter. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
