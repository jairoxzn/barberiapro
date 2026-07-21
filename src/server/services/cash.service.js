import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

// Resume los movimientos de una sesión de caja.
// El efectivo esperado = apertura + ventas en efectivo + ingresos - egresos.
const summarize = (session) => {
  const movements = session.movements ?? [];
  const sum = (type) =>
    movements
      .filter((m) => m.type === type)
      .reduce((acc, m) => acc + Number(m.amount), 0);

  const sales = sum('SALE');
  const income = sum('INCOME');
  const expense = sum('EXPENSE');
  const opening = Number(session.openingAmount);
  const expected = opening + sales + income - expense;

  return {
    ...session,
    summary: {
      opening,
      cashSales: sales,
      income,
      expense,
      expected,
      salesCount: session.sales?.length ?? 0,
      // Total facturado (todos los métodos de pago), no sólo efectivo.
      totalBilled: (session.sales ?? []).reduce((a, s) => a + Number(s.total), 0),
    },
  };
};

const include = {
  movements: { orderBy: { createdAt: 'desc' } },
  sales: { select: { id: true, code: true, total: true, createdAt: true } },
  branch: { select: { id: true, name: true } },
};

export const cashService = {
  async open(tenantId, { branchId, openingAmount }, userId) {
    const branch = await prisma.branch.findFirst({ where: { id: branchId, tenantId } });
    if (!branch) throw ApiError.badRequest('Sucursal inválida');

    const existing = await prisma.cashSession.findFirst({
      where: { branchId, status: 'OPEN' },
    });
    if (existing) {
      throw ApiError.conflict('Ya hay una caja abierta en esta sucursal');
    }

    const session = await prisma.cashSession.create({
      data: { tenantId, branchId, openingAmount, openedById: userId },
      include,
    });
    return summarize(session);
  },

  // Sesión abierta de una sucursal (null si no hay ninguna).
  async current(tenantId, branchId) {
    if (!branchId) throw ApiError.badRequest('Sucursal requerida');
    const session = await prisma.cashSession.findFirst({
      where: { tenantId, branchId, status: 'OPEN' },
      include,
    });
    return session ? summarize(session) : null;
  },

  async getById(tenantId, id) {
    const session = await prisma.cashSession.findFirst({
      where: { id, tenantId },
      include,
    });
    if (!session) throw ApiError.notFound('Sesión de caja no encontrada');
    return summarize(session);
  },

  async close(tenantId, id, closingAmount, userId) {
    const session = await this.getById(tenantId, id);
    if (session.status === 'CLOSED') {
      throw ApiError.badRequest('Esta caja ya fue cerrada');
    }

    const expected = session.summary.expected;
    const difference = closingAmount - expected;

    const closed = await prisma.cashSession.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closingAmount,
        expectedAmount: expected,
        difference,
        closedById: userId,
        closedAt: new Date(),
      },
      include,
    });
    return summarize(closed);
  },

  async addMovement(tenantId, id, { type, amount, concept }, userId) {
    const session = await this.getById(tenantId, id);
    if (session.status === 'CLOSED') {
      throw ApiError.badRequest('No se pueden registrar movimientos en una caja cerrada');
    }
    await prisma.cashMovement.create({
      data: { cashSessionId: id, type, amount, concept, createdById: userId },
    });
    return this.getById(tenantId, id);
  },

  async list(tenantId, { branchId, skip, limit }) {
    const where = { tenantId, ...(branchId ? { branchId } : {}) };
    const [rows, total] = await Promise.all([
      prisma.cashSession.findMany({
        where,
        orderBy: { openedAt: 'desc' },
        skip,
        take: limit,
        include,
      }),
      prisma.cashSession.count({ where }),
    ]);
    return { items: rows.map(summarize), total };
  },
};
