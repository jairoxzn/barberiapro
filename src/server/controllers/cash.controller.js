import { cashService } from '../services/cash.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created, paginate, pageMeta } from '../utils/apiResponse.js';

export const cashController = {
  current: asyncHandler(async (req, res) => {
    const branchId = req.query.branchId || req.user.branchId;
    ok(res, await cashService.current(req.user.tenantId, branchId));
  }),

  list: asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req.validatedQuery);
    const { items, total } = await cashService.list(req.user.tenantId, {
      branchId: req.validatedQuery.branchId,
      skip,
      limit,
    });
    ok(res, items, pageMeta(page, limit, total));
  }),

  get: asyncHandler(async (req, res) => {
    ok(res, await cashService.getById(req.user.tenantId, req.params.id));
  }),

  open: asyncHandler(async (req, res) => {
    created(res, await cashService.open(req.user.tenantId, req.body, req.user.id));
  }),

  close: asyncHandler(async (req, res) => {
    ok(
      res,
      await cashService.close(
        req.user.tenantId,
        req.params.id,
        req.body.closingAmount,
        req.user.id
      )
    );
  }),

  addMovement: asyncHandler(async (req, res) => {
    created(
      res,
      await cashService.addMovement(
        req.user.tenantId,
        req.params.id,
        req.body,
        req.user.id
      )
    );
  }),
};
