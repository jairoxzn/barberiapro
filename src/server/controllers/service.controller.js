import { serviceService, categoryService } from '../services/service.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created, noContent, paginate, pageMeta } from '../utils/apiResponse.js';

export const serviceController = {
  list: asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req.validatedQuery);
    const { search, isActive } = req.validatedQuery;
    const { items, total } = await serviceService.list(req.user.tenantId, {
      skip,
      limit,
      search,
      isActive,
    });
    ok(res, items, pageMeta(page, limit, total));
  }),

  get: asyncHandler(async (req, res) => {
    ok(res, await serviceService.getById(req.user.tenantId, req.params.id));
  }),

  create: asyncHandler(async (req, res) => {
    created(res, await serviceService.create(req.user.tenantId, req.body));
  }),

  update: asyncHandler(async (req, res) => {
    ok(res, await serviceService.update(req.user.tenantId, req.params.id, req.body));
  }),

  remove: asyncHandler(async (req, res) => {
    await serviceService.remove(req.user.tenantId, req.params.id);
    noContent(res);
  }),
};

export const categoryController = {
  list: asyncHandler(async (req, res) => {
    ok(res, await categoryService.list(req.user.tenantId));
  }),
  create: asyncHandler(async (req, res) => {
    created(res, await categoryService.create(req.user.tenantId, req.body));
  }),
  update: asyncHandler(async (req, res) => {
    ok(res, await categoryService.update(req.user.tenantId, req.params.id, req.body));
  }),
  remove: asyncHandler(async (req, res) => {
    await categoryService.remove(req.user.tenantId, req.params.id);
    noContent(res);
  }),
};
