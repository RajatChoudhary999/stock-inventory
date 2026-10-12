import { Router } from 'express';
import { ordersController } from './orders.controller';
import { createOrderSchema, listOrdersQuery, updateStatusSchema } from './orders.schema';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();
router.use(authenticate);

router.post('/', validate(createOrderSchema), asyncHandler(ordersController.create));
router.get('/', validate(listOrdersQuery, 'query'), asyncHandler(ordersController.list));
router.get('/:id', asyncHandler(ordersController.getOne));
router.patch(
  '/:id/status',
  authorize('ADMIN', 'MANAGER'),
  validate(updateStatusSchema),
  asyncHandler(ordersController.updateStatus),
);

export default router;
