import { Router } from 'express';
import { productsController } from './products.controller';
import {
  adjustStockSchema,
  createProductSchema,
  listMovementsQuery,
  listProductsQuery,
  updateProductSchema,
} from './products.schema';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(authenticate); // all product routes require login

router.get('/', validate(listProductsQuery, 'query'), asyncHandler(productsController.list));
router.get('/low-stock', asyncHandler(productsController.lowStock));
router.get('/movements', validate(listMovementsQuery, 'query'), asyncHandler(productsController.getMovements));
router.get('/:id', asyncHandler(productsController.getOne));
router.get('/:id/movements', validate(listMovementsQuery, 'query'), asyncHandler(productsController.getProductMovements));

// Mutations require MANAGER or ADMIN.
router.post('/', authorize('ADMIN', 'MANAGER'), validate(createProductSchema), asyncHandler(productsController.create));
router.post('/:id/adjust', authorize('ADMIN', 'MANAGER'), validate(adjustStockSchema), asyncHandler(productsController.adjustStock));
router.patch('/:id', authorize('ADMIN', 'MANAGER'), validate(updateProductSchema), asyncHandler(productsController.update));
router.delete('/:id', authorize('ADMIN', 'MANAGER'), asyncHandler(productsController.remove));

export default router;

