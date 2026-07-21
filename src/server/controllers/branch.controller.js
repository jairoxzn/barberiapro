import { branchService } from '../services/branch.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created, noContent } from '../utils/apiResponse.js';

export const branchController = {
  list: asyncHandler(async (req, res) => {
    ok(res, await branchService.list(req.user.tenantId));
  }),
  get: asyncHandler(async (req, res) => {
    ok(res, await branchService.getById(req.user.tenantId, req.params.id));
  }),
  create: asyncHandler(async (req, res) => {
    created(res, await branchService.create(req.user.tenantId, req.body));
  }),
  update: asyncHandler(async (req, res) => {
    ok(res, await branchService.update(req.user.tenantId, req.params.id, req.body));
  }),
  remove: asyncHandler(async (req, res) => {
    await branchService.remove(req.user.tenantId, req.params.id);
    noContent(res);
  }),
};
