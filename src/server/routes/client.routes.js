import { Router } from 'express';
import { clientController } from '../controllers/client.controller.js';
import { authenticate, authorize, staffOnly } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam, listQuery } from '../validators/common.js';
import {
  createClientSchema,
  updateClientSchema,
} from '../validators/client.validator.js';

const router = Router();

router.use(authenticate, staffOnly);

router.get('/', validate({ query: listQuery }), clientController.list);
router.get('/:id', validate({ params: idParam }), clientController.get);
router.get('/:id/history', validate({ params: idParam }), clientController.history);

router.post(
  '/',
  authorize('ADMIN', 'RECEPTIONIST'),
  validate(createClientSchema),
  clientController.create
);
router.put(
  '/:id',
  authorize('ADMIN', 'RECEPTIONIST'),
  validate({ params: idParam, ...updateClientSchema }),
  clientController.update
);
router.delete(
  '/:id',
  authorize('ADMIN'),
  validate({ params: idParam }),
  clientController.remove
);

export default router;
