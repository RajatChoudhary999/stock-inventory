import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';

const updateSchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF']).optional(),
  isActive: z.boolean().optional(),
});

const router = Router();
// User management is ADMIN-only.
router.use(authenticate, authorize('ADMIN'));

const publicSelect = { id: true, name: true, email: true, role: true, isActive: true, createdAt: true };

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ data: await prisma.user.findMany({ select: publicSelect, orderBy: { createdAt: 'desc' } }) });
  }),
);

router.patch(
  '/:id',
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: req.body,
      select: publicSelect,
    });
    res.json({ data: user });
  }),
);

export default router;
