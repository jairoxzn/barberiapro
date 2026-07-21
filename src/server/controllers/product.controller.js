import { productService } from '../services/product.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created, noContent, paginate, pageMeta } from '../utils/apiResponse.js';

export const productController = {
  list: asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req.validatedQuery);
    const { search, branchId, lowStock } = req.validatedQuery;
    const { items, total } = await productService.list(req.user.tenantId, {
      skip,
      limit,
      search,
      branchId,
      lowStock,
    });
    ok(res, items, pageMeta(page, limit, total));
  }),

  get: asyncHandler(async (req, res) => {
    ok(
      res,
      await productService.getById(req.user.tenantId, req.params.id, req.query.branchId)
    );
  }),

  create: asyncHandler(async (req, res) => {
    created(res, await productService.create(req.user.tenantId, req.body));
  }),

  update: asyncHandler(async (req, res) => {
    ok(res, await productService.update(req.user.tenantId, req.params.id, req.body));
  }),

  remove: asyncHandler(async (req, res) => {
    await productService.remove(req.user.tenantId, req.params.id);
    noContent(res);
  }),

  moveStock: asyncHandler(async (req, res) => {
    ok(
      res,
      await productService.moveStock(
        req.user.tenantId,
        req.params.id,
        req.body,
        req.user.id
      )
    );
  }),

  kardex: asyncHandler(async (req, res) => {
    ok(
      res,
      await productService.kardex(req.user.tenantId, req.params.id, {
        branchId: req.query.branchId,
      })
    );
  }),
};
