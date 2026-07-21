import { Router } from 'express';
import { productController } from '../controllers/product.controller.js';
import { authenticate, authorize, staffOnly } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam } from '../validators/common.js';
import {
  createProductSchema,
  updateProductSchema,
  stockMovementSchema,
  stockQuery,
} from '../validators/product.validator.js';

const router = Router();
router.use(authenticate, staffOnly);

router.get('/', validate(stockQuery), productController.list);
router.get('/:id', validate({ params: idParam }), productController.get);
router.get('/:id/kardex', validate({ params: idParam }), productController.kardex);

router.post(
  '/',
  authorize('ADMIN'),
  validate(createProductSchema),
  productController.create
);
router.put(
  '/:id',
  authorize('ADMIN'),
  validate({ params: idParam, ...updateProductSchema }),
  productController.update
);
router.delete(
  '/:id',
  authorize('ADMIN'),
  validate({ params: idParam }),
  productController.remove
);

// Entradas, salidas y ajustes de stock
router.post(
  '/:id/stock',
  authorize('ADMIN', 'RECEPTIONIST'),
  validate({ params: idParam, ...stockMovementSchema }),
  productController.moveStock
);

export default router;
