import { settingsService } from '../services/settings.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export const settingsController = {
  get: asyncHandler(async (req, res) => {
    ok(res, await settingsService.get(req.user.tenantId));
  }),

  update: asyncHandler(async (req, res) => {
    ok(res, await settingsService.update(req.user.tenantId, req.body));
  }),

  uploadLogo: asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('No se recibió ninguna imagen');
    const url = `/uploads/${req.file.filename}`;
    ok(res, await settingsService.updateLogo(req.user.tenantId, url));
  }),
};
