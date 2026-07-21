import { saleService } from '../services/sale.service.js';
import { buildTicketPdf } from '../services/ticket.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created, paginate, pageMeta } from '../utils/apiResponse.js';

export const saleController = {
  list: asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req.validatedQuery);
    const { branchId, clientId, from, to } = req.validatedQuery;
    const { items, total } = await saleService.list(req.user.tenantId, {
      branchId,
      clientId,
      from,
      to,
      skip,
      limit,
    });
    ok(res, items, pageMeta(page, limit, total));
  }),

  get: asyncHandler(async (req, res) => {
    ok(res, await saleService.getById(req.user.tenantId, req.params.id));
  }),

  create: asyncHandler(async (req, res) => {
    created(res, await saleService.create(req.user.tenantId, req.body, req.user.id));
  }),

  cancel: asyncHandler(async (req, res) => {
    ok(res, await saleService.cancel(req.user.tenantId, req.params.id, req.user.id));
  }),

  ticket: asyncHandler(async (req, res) => {
    const sale = await saleService.getById(req.user.tenantId, req.params.id);
    const pdf = await buildTicketPdf(sale);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="ticket-${sale.code}.pdf"`
    );
    res.send(Buffer.from(pdf));
  }),
};
