import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

const PAYMENT_LABEL = {
  CASH: 'Efectivo', YAPE: 'Yape', PLIN: 'Plin',
  TRANSFER: 'Transferencia', CARD: 'Tarjeta', POINTS: 'Puntos',
};

// Rango por defecto: mes actual.
const resolveRange = ({ from, to }) => {
  const now = new Date();
  const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  const end = to ? new Date(to) : now;
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const round2 = (n) => Math.round(n * 100) / 100;
const fmtDate = (d) => new Date(d).toLocaleDateString('es-PE');

export const reportService = {
  // -------------------------------------------------------------- Ventas
  async sales(tenantId, { branchId, from, to }) {
    const { start, end } = resolveRange({ from, to });
    const sales = await prisma.sale.findMany({
      where: {
        tenantId,
        status: 'PAID',
        createdAt: { gte: start, lte: end },
        ...(branchId ? { branchId } : {}),
      },
      orderBy: { createdAt: 'asc' },
      include: {
        client: { select: { firstName: true, lastName: true } },
        branch: { select: { name: true } },
        payments: true,
      },
    });

    const byMethod = {};
    let totalSum = 0;
    const rows = sales.map((s) => {
      totalSum += Number(s.total);
      for (const p of s.payments) {
        byMethod[p.method] = (byMethod[p.method] || 0) + Number(p.amount);
      }
      return {
        date: s.createdAt,
        code: s.code,
        client: s.client
          ? `${s.client.firstName} ${s.client.lastName || ''}`.trim()
          : 'Ocasional',
        branch: s.branch?.name ?? '',
        subtotal: Number(s.subtotal),
        discount: Number(s.discount),
        tax: Number(s.tax),
        total: Number(s.total),
        payment: s.payments.map((p) => PAYMENT_LABEL[p.method]).join(', '),
      };
    });

    const summary = [
      { label: 'Ventas', value: sales.length },
      { label: 'Total facturado', value: round2(totalSum) },
      ...Object.entries(byMethod).map(([m, v]) => ({
        label: `Cobrado en ${PAYMENT_LABEL[m]}`,
        value: round2(v),
      })),
    ];

    return {
      title: 'Reporte de Ventas',
      subtitle: `${fmtDate(start)} — ${fmtDate(end)}`,
      columns: [
        { key: 'date', label: 'Fecha', type: 'date' },
        { key: 'code', label: 'Código' },
        { key: 'client', label: 'Cliente' },
        { key: 'branch', label: 'Sucursal' },
        { key: 'subtotal', label: 'Subtotal', type: 'money', align: 'right' },
        { key: 'discount', label: 'Desc.', type: 'money', align: 'right' },
        { key: 'tax', label: 'IGV', type: 'money', align: 'right' },
        { key: 'total', label: 'Total', type: 'money', align: 'right' },
        { key: 'payment', label: 'Pago' },
      ],
      rows,
      summary,
    };
  },

  // -------------------------------------------------- Comisiones de barberos
  async commissions(tenantId, { branchId, from, to }) {
    const { start, end } = resolveRange({ from, to });

    // Comisión sobre citas finalizadas en el rango.
    const grouped = await prisma.appointment.groupBy({
      by: ['barberId'],
      where: {
        tenantId,
        status: 'COMPLETED',
        startTime: { gte: start, lte: end },
        ...(branchId ? { branchId } : {}),
      },
      _count: { _all: true },
      _sum: { totalPrice: true },
    });

    const barbers = await prisma.barber.findMany({
      where: { id: { in: grouped.map((g) => g.barberId) } },
      select: { id: true, name: true, commissionRate: true },
    });
    const map = Object.fromEntries(barbers.map((b) => [b.id, b]));

    let totalCommission = 0;
    const rows = grouped.map((g) => {
      const b = map[g.barberId];
      const revenue = Number(g._sum.totalPrice ?? 0);
      const rate = Number(b?.commissionRate ?? 0);
      const commission = round2((revenue * rate) / 100);
      totalCommission += commission;
      return {
        barber: b?.name ?? 'N/D',
        services: g._count._all,
        revenue,
        rate: `${rate}%`,
        commission,
      };
    });
    rows.sort((a, b) => b.commission - a.commission);

    return {
      title: 'Reporte de Comisiones',
      subtitle: `${fmtDate(start)} — ${fmtDate(end)}`,
      columns: [
        { key: 'barber', label: 'Barbero' },
        { key: 'services', label: 'Servicios', type: 'number', align: 'right' },
        { key: 'revenue', label: 'Facturado', type: 'money', align: 'right' },
        { key: 'rate', label: 'Comisión', align: 'right' },
        { key: 'commission', label: 'A pagar', type: 'money', align: 'right' },
      ],
      rows,
      summary: [
        { label: 'Barberos', value: rows.length },
        { label: 'Total comisiones', value: round2(totalCommission) },
      ],
    };
  },

  // ------------------------------------------------ Productos más vendidos
  async topProducts(tenantId, { branchId, from, to }) {
    const { start, end } = resolveRange({ from, to });
    const grouped = await prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        productId: { not: null },
        sale: {
          tenantId,
          status: 'PAID',
          createdAt: { gte: start, lte: end },
          ...(branchId ? { branchId } : {}),
        },
      },
      _sum: { quantity: true, total: true },
    });

    const products = await prisma.product.findMany({
      where: { id: { in: grouped.map((g) => g.productId) } },
      select: { id: true, name: true, sku: true },
    });
    const map = Object.fromEntries(products.map((p) => [p.id, p]));

    let totalQty = 0;
    let totalRevenue = 0;
    const rows = grouped.map((g) => {
      const qty = g._sum.quantity ?? 0;
      const revenue = Number(g._sum.total ?? 0);
      totalQty += qty;
      totalRevenue += revenue;
      return {
        product: map[g.productId]?.name ?? 'N/D',
        sku: map[g.productId]?.sku ?? '',
        qty,
        revenue,
      };
    });
    rows.sort((a, b) => b.qty - a.qty);

    return {
      title: 'Productos más vendidos',
      subtitle: `${fmtDate(start)} — ${fmtDate(end)}`,
      columns: [
        { key: 'product', label: 'Producto' },
        { key: 'sku', label: 'SKU' },
        { key: 'qty', label: 'Unidades', type: 'number', align: 'right' },
        { key: 'revenue', label: 'Ingresos', type: 'money', align: 'right' },
      ],
      rows,
      summary: [
        { label: 'Unidades vendidas', value: totalQty },
        { label: 'Ingresos por productos', value: round2(totalRevenue) },
      ],
    };
  },

  // ------------------------------------------------ Inventario valorizado
  async inventory(tenantId, { branchId }) {
    const products = await prisma.product.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
      include: { stocks: branchId ? { where: { branchId } } : true },
    });

    let totalCost = 0;
    let totalSale = 0;
    let lowCount = 0;
    const rows = products.map((p) => {
      const stock = p.stocks.reduce((a, s) => a + s.quantity, 0);
      const valCost = round2(stock * Number(p.costPrice));
      const valSale = round2(stock * Number(p.salePrice));
      totalCost += valCost;
      totalSale += valSale;
      const low = stock <= p.minStock;
      if (low) lowCount += 1;
      return {
        product: p.name,
        sku: p.sku ?? '',
        stock,
        minStock: p.minStock,
        cost: Number(p.costPrice),
        valCost,
        valSale,
        status: low ? 'STOCK BAJO' : 'OK',
      };
    });

    return {
      title: 'Inventario Valorizado',
      subtitle: branchId ? 'Sucursal seleccionada' : 'Todas las sucursales',
      columns: [
        { key: 'product', label: 'Producto' },
        { key: 'sku', label: 'SKU' },
        { key: 'stock', label: 'Stock', type: 'number', align: 'right' },
        { key: 'minStock', label: 'Mín.', type: 'number', align: 'right' },
        { key: 'cost', label: 'Costo U.', type: 'money', align: 'right' },
        { key: 'valCost', label: 'Valor costo', type: 'money', align: 'right' },
        { key: 'valSale', label: 'Valor venta', type: 'money', align: 'right' },
        { key: 'status', label: 'Estado' },
      ],
      rows,
      summary: [
        { label: 'Productos', value: rows.length },
        { label: 'En stock bajo', value: lowCount },
        { label: 'Valor a costo', value: round2(totalCost) },
        { label: 'Valor a venta', value: round2(totalSale) },
      ],
    };
  },

  // -------------------------------------------------------------- Caja
  async cash(tenantId, { branchId, from, to }) {
    const { start, end } = resolveRange({ from, to });
    const sessions = await prisma.cashSession.findMany({
      where: {
        tenantId,
        openedAt: { gte: start, lte: end },
        ...(branchId ? { branchId } : {}),
      },
      orderBy: { openedAt: 'desc' },
      include: { branch: { select: { name: true } } },
    });

    let totalDiff = 0;
    const rows = sessions.map((s) => {
      const diff = Number(s.difference ?? 0);
      totalDiff += diff;
      return {
        opened: s.openedAt,
        branch: s.branch?.name ?? '',
        opening: Number(s.openingAmount),
        expected: s.expectedAmount != null ? Number(s.expectedAmount) : '',
        counted: s.closingAmount != null ? Number(s.closingAmount) : '',
        difference: s.status === 'CLOSED' ? diff : '',
        status: s.status === 'OPEN' ? 'Abierta' : 'Cerrada',
      };
    });

    return {
      title: 'Reporte de Caja',
      subtitle: `${fmtDate(start)} — ${fmtDate(end)}`,
      columns: [
        { key: 'opened', label: 'Apertura', type: 'date' },
        { key: 'branch', label: 'Sucursal' },
        { key: 'opening', label: 'Monto inicial', type: 'money', align: 'right' },
        { key: 'expected', label: 'Esperado', type: 'money', align: 'right' },
        { key: 'counted', label: 'Contado', type: 'money', align: 'right' },
        { key: 'difference', label: 'Diferencia', type: 'money', align: 'right' },
        { key: 'status', label: 'Estado' },
      ],
      rows,
      summary: [
        { label: 'Sesiones', value: sessions.length },
        { label: 'Diferencia acumulada', value: round2(totalDiff) },
      ],
    };
  },
};

// Mapa de reportes disponibles.
export const REPORTS = {
  sales: reportService.sales,
  commissions: reportService.commissions,
  products: reportService.topProducts,
  inventory: reportService.inventory,
  cash: reportService.cash,
};

export const runReport = (type, tenantId, filters) => {
  const fn = REPORTS[type];
  if (!fn) throw ApiError.badRequest(`Reporte desconocido: ${type}`);
  return fn.call(reportService, tenantId, filters);
};
