import { Router } from 'express';
import { scheduleController } from '../controllers/schedule.controller.js';
import { authenticate, authorize, staffOnly } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam } from '../validators/common.js';
import {
  createBlockSchema,
  updateBlockSchema,
  listBlocksQuery,
  updateScheduleSettingsSchema,
} from '../validators/schedule.validator.js';

const router = Router();
router.use(authenticate, staffOnly);

// Visión general de horarios, sucursales y barberos
router.get('/overview', scheduleController.overview);

// Configuración de reglas de reserva (slots, anticipación, buffer, cancelación)
router.get('/settings', scheduleController.getSettings);
router.put(
  '/settings',
  authorize('ADMIN'),
  validate(updateScheduleSettingsSchema),
  scheduleController.updateSettings
);

// Bloqueos de horarios
router.get('/blocks', validate(listBlocksQuery), scheduleController.listBlocks);
router.get('/blocks/:id', validate({ params: idParam }), scheduleController.getBlock);
router.post(
  '/blocks',
  authorize('ADMIN', 'RECEPTIONIST'),
  validate(createBlockSchema),
  scheduleController.createBlock
);
router.put(
  '/blocks/:id',
  authorize('ADMIN', 'RECEPTIONIST'),
  validate({ params: idParam, ...updateBlockSchema }),
  scheduleController.updateBlock
);
router.delete(
  '/blocks/:id',
  authorize('ADMIN', 'RECEPTIONIST'),
  validate({ params: idParam }),
  scheduleController.deleteBlock
);

export default router;
