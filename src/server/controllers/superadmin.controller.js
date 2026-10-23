import { superadminService } from '../services/superadmin.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created } from '../utils/apiResponse.js';

export const superadminController = {
  getMetrics: asyncHandler(async (_req, res) => {
    const metrics = await superadminService.getMetrics();
    ok(res, metrics);
  }),

  listTenants: asyncHandler(async (req, res) => {
    const result = await superadminService.listTenants(req.query);
    ok(res, result.data, result.meta);
  }),

  getTenant: asyncHandler(async (req, res) => {
    const tenant = await superadminService.getTenantById(req.params.id);
    ok(res, tenant);
  }),

  createTenant: asyncHandler(async (req, res) => {
    const tenant = await superadminService.createTenant(req.body);
    created(res, tenant);
  }),

  toggleStatus: asyncHandler(async (req, res) => {
    const { isActive } = req.body;
    const updated = await superadminService.toggleTenantStatus(req.params.id, Boolean(isActive));
    ok(res, updated);
  }),

  impersonate: asyncHandler(async (req, res) => {
    const session = await superadminService.impersonateTenant(req.params.id);
    ok(res, session);
  }),
};
