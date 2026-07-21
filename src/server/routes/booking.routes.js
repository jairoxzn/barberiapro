import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam } from '../validators/common.js';
import { availabilityQuery, bookSchema } from '../validators/booking.validator.js';

// Portal de reserva online: sólo clientes autenticados (rol CLIENT).
const router = Router();
router.use(authenticate, authorize('CLIENT'));

router.get('/me', bookingController.me);
router.get('/availability', validate(availabilityQuery), bookingController.availability);
router.get('/appointments', bookingController.myAppointments);
router.post('/appointments', validate(bookSchema), bookingController.book);
router.post('/appointments/:id/cancel', validate({ params: idParam }), bookingController.cancel);

export default router;
