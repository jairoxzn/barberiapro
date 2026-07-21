import { Router } from 'express';
import {
  serviceController,
  categoryController,
} from '../controllers/service.controller.js';
import { authenticate, authorize, staffOnly } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam, listQuery } from '../validators/common.js';
import {
  createServiceSchema,
  updateServiceSchema,
  createCategorySchema,
  updateCategorySchema,
} from '../validators/service.validator.js';

const router = Router();
router.use(authenticate, staffOnly);

// --- Categorías (rutas anidadas antes de /:id para evitar colisión) ---
router.get('/categories', categoryController.list);
router.post(
  '/categories',
  authorize('ADMIN'),
  validate(createCategorySchema),
  categoryController.create
);
router.put(
  '/categories/:id',
  authorize('ADMIN'),
  validate({ params: idParam, ...updateCategorySchema }),
  categoryController.update
);
router.delete(
  '/categories/:id',
  authorize('ADMIN'),
  validate({ params: idParam }),
  categoryController.remove
);

// --- Servicios ---
router.get('/', validate({ query: listQuery }), serviceController.list);
router.get('/:id', validate({ params: idParam }), serviceController.get);
router.post('/', authorize('ADMIN'), validate(createServiceSchema), serviceController.create);
router.put(
  '/:id',
  authorize('ADMIN'),
  validate({ params: idParam, ...updateServiceSchema }),
  serviceController.update
);
router.delete('/:id', authorize('ADMIN'), validate({ params: idParam }), serviceController.remove);

export default router;
