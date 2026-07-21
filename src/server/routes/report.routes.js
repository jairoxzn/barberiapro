import { Router } from 'express';
import { reportController } from '../controllers/report.controller.js';
import { authenticate, authorize, staffOnly } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { reportParams, reportQuery } from '../validators/report.validator.js';

const router = Router();
router.use(authenticate, staffOnly);

// Los reportes son sensibles: sólo ADMIN y RECEPTIONIST.
router.get(
  '/:type',
  authorize('ADMIN', 'RECEPTIONIST'),
  validate({ ...reportParams, ...reportQuery }),
  reportController.run
);

export default router;
