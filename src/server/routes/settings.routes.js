import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller.js';
import { authenticate, authorize, staffOnly } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { upload } from '../middleware/upload.js';
import { updateSettingsSchema } from '../validators/settings.validator.js';

const router = Router();
router.use(authenticate, staffOnly);

// Cualquier staff puede leer la configuración (para moneda, colores, etc.).
router.get('/', settingsController.get);

// Solo ADMIN modifica.
router.put('/', authorize('ADMIN'), validate(updateSettingsSchema), settingsController.update);
router.post('/logo', authorize('ADMIN'), upload.single('logo'), settingsController.uploadLogo);

export default router;
