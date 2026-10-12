import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { authenticate } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const data = await prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
    res.json({ data });
  }),
);

router.patch(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const data = await prisma.notification.update({
      where: { id: Number(req.params.id) },
      data: { isRead: true },
    });
    res.json({ data });
  }),
);

export default router;
