import { barberService } from '../services/barber.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created, noContent, paginate, pageMeta } from '../utils/apiResponse.js';

export const barberController = {
  list: asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req.validatedQuery);
    const { search, isActive } = req.validatedQuery;
    const { items, total } = await barberService.list(req.user.tenantId, {
      skip,
      limit,
      search,
      isActive,
    });
    ok(res, items, pageMeta(page, limit, total));
  }),

  get: asyncHandler(async (req, res) => {
    ok(res, await barberService.getById(req.user.tenantId, req.params.id));
  }),

  create: asyncHandler(async (req, res) => {
    created(res, await barberService.create(req.user.tenantId, req.body));
  }),

  update: asyncHandler(async (req, res) => {
    ok(res, await barberService.update(req.user.tenantId, req.params.id, req.body));
  }),

  remove: asyncHandler(async (req, res) => {
    await barberService.remove(req.user.tenantId, req.params.id);
    noContent(res);
  }),

  setSchedule: asyncHandler(async (req, res) => {
    ok(
      res,
      await barberService.setSchedule(
        req.user.tenantId,
        req.params.id,
        req.body.schedules
      )
    );
  }),

  addTimeOff: asyncHandler(async (req, res) => {
    created(
      res,
      await barberService.addTimeOff(req.user.tenantId, req.params.id, req.body)
    );
  }),

  removeTimeOff: asyncHandler(async (req, res) => {
    await barberService.removeTimeOff(
      req.user.tenantId,
      req.params.id,
      req.params.timeOffId
    );
    noContent(res);
  }),
};
