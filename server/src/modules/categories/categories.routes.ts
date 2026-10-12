import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { HttpError } from '../../utils/httpError';

const schema = z.object({ name: z.string().min(2).max(60), description: z.string().max(300).optional() });

const router = Router();
router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ data: await prisma.category.findMany({ orderBy: { name: 'asc' } }) });
  }),
);

router.post(
  '/',
  authorize('ADMIN', 'MANAGER'),
  validate(schema),
  asyncHandler(async (req, res) => {
    const exists = await prisma.category.findUnique({ where: { name: req.body.name } });
    if (exists) throw HttpError.conflict('NAME_TAKEN', 'Category already exists');
    res.status(201).json({ data: await prisma.category.create({ data: req.body }) });
  }),
);

export default router;
