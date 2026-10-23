import { Router } from 'express';
import { superadminController } from '../controllers/superadmin.controller.js';
import { authenticate, superAdminOnly } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createTenantSchema, toggleStatusSchema } from '../validators/superadmin.validator.js';

const router = Router();

// Todas las rutas de superadmin requieren autenticación y rol SUPER_ADMIN
router.use(authenticate, superAdminOnly);

// Métricas de alto nivel para el dashboard SaaS
router.get('/metrics', superadminController.getMetrics);

// Gestión y listado de barberías (tenants)
router.get('/tenants', superadminController.listTenants);
router.get('/tenants/:id', superadminController.getTenant);
router.post('/tenants', validate(createTenantSchema), superadminController.createTenant);
router.patch('/tenants/:id/status', validate(toggleStatusSchema), superadminController.toggleStatus);

// Impersonar barbería (soporte técnico)
router.post('/tenants/:id/impersonate', superadminController.impersonate);

export default router;
