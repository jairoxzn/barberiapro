import { Router } from 'express';
import { saleController } from '../controllers/sale.controller.js';
import { authenticate, authorize, staffOnly } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam } from '../validators/common.js';
import { createSaleSchema, saleQuery } from '../validators/sale.validator.js';

const router = Router();
router.use(authenticate, staffOnly);

router.get('/', validate(saleQuery), saleController.list);
router.get('/:id', validate({ params: idParam }), saleController.get);
router.get('/:id/ticket', validate({ params: idParam }), saleController.ticket);

router.post(
  '/',
  authorize('ADMIN', 'RECEPTIONIST', 'BARBER'),
  validate(createSaleSchema),
  saleController.create
);
router.post(
  '/:id/cancel',
  authorize('ADMIN'),
  validate({ params: idParam }),
  saleController.cancel
);

export default router;
