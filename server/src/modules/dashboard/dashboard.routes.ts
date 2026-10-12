import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { dashboardService } from './dashboard.service';

const router = Router();
router.get(
  '/summary',
  authenticate,
  asyncHandler(async (_req, res) => {
    res.json({ data: await dashboardService.summary() });
  }),
);
export default router;
