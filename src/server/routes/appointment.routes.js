import { Router } from 'express';
import { appointmentController } from '../controllers/appointment.controller.js';
import { authenticate, authorize, staffOnly } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam } from '../validators/common.js';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  statusSchema,
  agendaQuery,
} from '../validators/appointment.validator.js';

const router = Router();
router.use(authenticate, staffOnly);

router.get('/', validate(agendaQuery), appointmentController.agenda);
router.get('/:id', validate({ params: idParam }), appointmentController.get);

router.post(
  '/',
  authorize('ADMIN', 'RECEPTIONIST', 'BARBER'),
  validate(createAppointmentSchema),
  appointmentController.create
);
router.put(
  '/:id',
  authorize('ADMIN', 'RECEPTIONIST', 'BARBER'),
  validate({ params: idParam, ...updateAppointmentSchema }),
  appointmentController.update
);
router.patch(
  '/:id/status',
  authorize('ADMIN', 'RECEPTIONIST', 'BARBER'),
  validate({ params: idParam, ...statusSchema }),
  appointmentController.changeStatus
);
router.delete(
  '/:id',
  authorize('ADMIN', 'RECEPTIONIST'),
  validate({ params: idParam }),
  appointmentController.remove
);

export default router;
