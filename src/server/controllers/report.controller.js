import { runReport } from '../services/report.service.js';
import { exportReport } from '../services/report.export.js';
import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export const reportController = {
  // GET /reports/:type?format=json|csv|xlsx|pdf&from=&to=&branchId=
  run: asyncHandler(async (req, res) => {
    const { type } = req.params;
    const { branchId, from, to, format = 'json' } = req.validatedQuery;

    const report = await runReport(type, req.user.tenantId, { branchId, from, to });

    if (format === 'json') {
      return ok(res, report);
    }

    // Símbolo de moneda del tenant para los PDF.
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId: req.user.tenantId },
      select: { currency: true },
    });
    const symbol = settings?.currency === 'USD' ? '$' : 'S/';

    const result = await exportReport(report, format, { symbol });
    if (!result) throw ApiError.badRequest('Formato no soportado');

    const filename = `${type}-${new Date().toISOString().slice(0, 10)}.${result.ext}`;
    res.setHeader('Content-Type', result.mime);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(result.buffer);
  }),
};
