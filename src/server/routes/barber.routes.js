import { Router } from 'express';
import { barberController } from '../controllers/barber.controller.js';
import { authenticate, authorize, staffOnly } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam, listQuery } from '../validators/common.js';
import {
  createBarberSchema,
  updateBarberSchema,
  scheduleSchema,
  timeOffSchema,
} from '../validators/barber.validator.js';

const router = Router();
router.use(authenticate, staffOnly);

router.get('/', validate({ query: listQuery }), barberController.list);
router.get('/:id', validate({ params: idParam }), barberController.get);

router.post('/', authorize('ADMIN'), validate(createBarberSchema), barberController.create);
router.put(
  '/:id',
  authorize('ADMIN'),
  validate({ params: idParam, ...updateBarberSchema }),
  barberController.update
);
router.delete('/:id', authorize('ADMIN'), validate({ params: idParam }), barberController.remove);

// Horario semanal
router.put(
  '/:id/schedule',
  authorize('ADMIN'),
  validate({ params: idParam, ...scheduleSchema }),
  barberController.setSchedule
);

// Vacaciones / días libres
router.post(
  '/:id/time-off',
  authorize('ADMIN'),
  validate({ params: idParam, ...timeOffSchema }),
  barberController.addTimeOff
);
router.delete(
  '/:id/time-off/:timeOffId',
  authorize('ADMIN'),
  barberController.removeTimeOff
);

export default router;
