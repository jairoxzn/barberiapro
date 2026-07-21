import { appointmentService } from '../services/appointment.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created, noContent } from '../utils/apiResponse.js';

export const appointmentController = {
  agenda: asyncHandler(async (req, res) => {
    const data = await appointmentService.agenda(
      req.user.tenantId,
      req.validatedQuery
    );
    ok(res, data);
  }),

  get: asyncHandler(async (req, res) => {
    ok(res, await appointmentService.getById(req.user.tenantId, req.params.id));
  }),

  create: asyncHandler(async (req, res) => {
    created(res, await appointmentService.create(req.user.tenantId, req.body));
  }),

  update: asyncHandler(async (req, res) => {
    ok(res, await appointmentService.update(req.user.tenantId, req.params.id, req.body));
  }),

  changeStatus: asyncHandler(async (req, res) => {
    ok(
      res,
      await appointmentService.changeStatus(
        req.user.tenantId,
        req.params.id,
        req.body.status
      )
    );
  }),

  remove: asyncHandler(async (req, res) => {
    await appointmentService.remove(req.user.tenantId, req.params.id);
    noContent(res);
  }),
};
