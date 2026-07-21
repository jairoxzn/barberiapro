import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  registerClientSchema,
  loginClientSchema,
} from '../validators/auth.validator.js';

const router = Router();

// Limitador más estricto para endpoints sensibles de autenticación.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Demasiados intentos, espera unos minutos' },
  },
});

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);

// Reserva online: cuentas de cliente (scoped por barbería)
router.post('/client/register', authLimiter, validate(registerClientSchema), authController.registerClient);
router.post('/client/login', authLimiter, validate(loginClientSchema), authController.loginClient);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.me);

export default router;
