import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(200).optional(),
});

const router = Router();
router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ data: await prisma.supplier.findMany({ orderBy: { name: 'asc' } }) });
  }),
);

router.post(
  '/',
  authorize('ADMIN', 'MANAGER'),
  validate(schema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await prisma.supplier.create({ data: req.body }) });
  }),
);

export default router;
