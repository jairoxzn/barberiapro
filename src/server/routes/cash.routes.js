import { Router } from 'express';
import { cashController } from '../controllers/cash.controller.js';
import { authenticate, authorize, staffOnly } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam } from '../validators/common.js';
import {
  openCashSchema,
  closeCashSchema,
  movementSchema,
  cashQuery,
} from '../validators/cash.validator.js';

const router = Router();
router.use(authenticate, staffOnly);

// La caja abierta de la sucursal actual (antes de /:id para evitar colisión)
router.get('/current', cashController.current);
router.get('/', validate(cashQuery), cashController.list);
router.get('/:id', validate({ params: idParam }), cashController.get);

router.post(
  '/open',
  authorize('ADMIN', 'RECEPTIONIST'),
  validate(openCashSchema),
  cashController.open
);
router.post(
  '/:id/close',
  authorize('ADMIN', 'RECEPTIONIST'),
  validate({ params: idParam, ...closeCashSchema }),
  cashController.close
);
router.post(
  '/:id/movements',
  authorize('ADMIN', 'RECEPTIONIST'),
  validate({ params: idParam, ...movementSchema }),
  cashController.addMovement
);

export default router;
