import { Router } from 'express';
import { publicService } from '../services/public.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';

// Rutas públicas (sin autenticación) para el portal de reserva online.
const router = Router();

router.get(
  '/barbershop/:slug',
  asyncHandler(async (req, res) => {
    ok(res, await publicService.barbershopBySlug(req.params.slug));
  })
);

export default router;
