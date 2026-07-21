import { clientService } from '../services/client.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created, noContent, paginate, pageMeta } from '../utils/apiResponse.js';

export const clientController = {
  list: asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req.validatedQuery);
    const { search, isActive } = req.validatedQuery;
    const { items, total } = await clientService.list(req.user.tenantId, {
      skip,
      limit,
      search,
      isActive,
    });
    ok(res, items, pageMeta(page, limit, total));
  }),

  get: asyncHandler(async (req, res) => {
    const client = await clientService.getById(req.user.tenantId, req.params.id);
    ok(res, client);
  }),

  history: asyncHandler(async (req, res) => {
    const data = await clientService.history(req.user.tenantId, req.params.id);
    ok(res, data);
  }),

  create: asyncHandler(async (req, res) => {
    const client = await clientService.create(req.user.tenantId, req.body);
    created(res, client);
  }),

  update: asyncHandler(async (req, res) => {
    const client = await clientService.update(
      req.user.tenantId,
      req.params.id,
      req.body
    );
    ok(res, client);
  }),

  remove: asyncHandler(async (req, res) => {
    await clientService.remove(req.user.tenantId, req.params.id);
    noContent(res);
  }),
};
