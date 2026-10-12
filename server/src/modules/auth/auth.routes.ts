import { Router } from 'express';
import { authController } from './auth.controller';
import { loginSchema, registerSchema } from './auth.schema';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimit';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), asyncHandler(authController.register));
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(authController.login));
router.post('/refresh', asyncHandler(authController.refresh));
router.post('/logout', asyncHandler(authController.logout));
router.get('/me', authenticate, asyncHandler(authController.me));

export default router;
