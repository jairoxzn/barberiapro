import { scheduleService } from '../services/schedule.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created, noContent } from '../utils/apiResponse.js';

export const scheduleController = {
  listBlocks: asyncHandler(async (req, res) => {
    ok(res, await scheduleService.listBlocks(req.user.tenantId, req.query));
  }),

  getBlock: asyncHandler(async (req, res) => {
    ok(res, await scheduleService.getBlockById(req.user.tenantId, req.params.id));
  }),

  createBlock: asyncHandler(async (req, res) => {
    created(res, await scheduleService.createBlock(req.user.tenantId, req.body));
  }),

  updateBlock: asyncHandler(async (req, res) => {
    ok(res, await scheduleService.updateBlock(req.user.tenantId, req.params.id, req.body));
  }),

  deleteBlock: asyncHandler(async (req, res) => {
    await scheduleService.deleteBlock(req.user.tenantId, req.params.id);
    noContent(res);
  }),

  getSettings: asyncHandler(async (req, res) => {
    ok(res, await scheduleService.getSettings(req.user.tenantId));
  }),

  updateSettings: asyncHandler(async (req, res) => {
    ok(res, await scheduleService.updateSettings(req.user.tenantId, req.body));
  }),

  overview: asyncHandler(async (req, res) => {
    ok(res, await scheduleService.getOverview(req.user.tenantId, req.query));
  }),
};
