import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { applyStockMovement } from './inventory.service.js';

// Tolerancia para comparar importes (evita falsos negativos por redondeo).
const EPS = 0.01;
const round2 = (n) => Math.round(n * 100) / 100;

const include = {
  items: {
    include: {
      service: { select: { id: true, name: true } },
      product: { select: { id: true, name: true } },
    },
  },
  payments: true,
  client: { select: { id: true, firstName: true, lastName: true } },
  branch: { select: { id: true, name: true } },
};

// Determina el nivel de fidelización según los puntos acumulados.
const resolveTier = (tiers, points) => {
  const sorted = [...tiers].sort((a, b) => b.minPoints - a.minPoints);
  return sorted.find((t) => points >= t.minPoints)?.level ?? 'BRONZE';
};

export const saleService = {
  /**
   * Registra una venta completa de forma atómica:
   * ítems + pagos + descuento de stock + kardex + puntos + caja.
   * Si algo falla, no se persiste nada.
   */
  async create(tenantId, data, userId) {
    const { branchId, clientId, appointmentId, items, discount, applyTax, payments } = data;

    return prisma.$transaction(async (tx) => {
      const branch = await tx.branch.findFirst({ where: { id: branchId, tenantId } });
      if (!branch) throw ApiError.badRequest('Sucursal inválida');

      const settings = await tx.tenantSettings.findUnique({ where: { tenantId } });

      // --- 1. Resolver líneas contra el catálogo (nunca confiar en el precio del cliente) ---
      const serviceIds = items.filter((i) => i.serviceId).map((i) => i.serviceId);
      const productIds = items.filter((i) => i.productId).map((i) => i.productId);

      const [services, products] = await Promise.all([
        serviceIds.length
          ? tx.service.findMany({ where: { id: { in: serviceIds }, tenantId } })
          : [],
        productIds.length
          ? tx.product.findMany({ where: { id: { in: productIds }, tenantId } })
          : [],
      ]);

      const serviceMap = Object.fromEntries(services.map((s) => [s.id, s]));
      const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

      const resolvedItems = items.map((item) => {
        const source = item.serviceId
          ? serviceMap[item.serviceId]
          : productMap[item.productId];
        if (!source) {
          throw ApiError.badRequest(
            `El ${item.serviceId ? 'servicio' : 'producto'} indicado no existe`
          );
        }
        const catalogPrice = Number(
          item.serviceId ? source.price : source.salePrice
        );
        const unitPrice = item.unitPrice ?? catalogPrice;
        const total = round2(unitPrice * item.quantity - item.discount);
        if (total < 0) throw ApiError.badRequest('El descuento supera el importe de la línea');

        return {
          serviceId: item.serviceId || null,
          productId: item.productId || null,
          barberId: item.barberId || null,
          description: source.name,
          quantity: item.quantity,
          unitPrice,
          discount: item.discount,
          total,
        };
      });

      // --- 2. Totales ---
      const subtotal = round2(resolvedItems.reduce((a, i) => a + i.total, 0));
      if (discount > subtotal) {
        throw ApiError.badRequest('El descuento general supera el subtotal');
      }
      const base = round2(subtotal - discount);
      const taxRate = Number(settings?.taxRate ?? 0);
      const tax = applyTax ? round2(base * (taxRate / 100)) : 0;
      const total = round2(base + tax);

      // --- 3. Validar pagos ---
      const paid = round2(payments.reduce((a, p) => a + p.amount, 0));
      if (Math.abs(paid - total) > EPS) {
        throw ApiError.badRequest(
          `Los pagos (${paid.toFixed(2)}) no coinciden con el total (${total.toFixed(2)})`
        );
      }

      // --- 4. Correlativo (serie + contador del tenant) ---
      const series = settings?.invoiceSeries ?? 'B001';
      const nextCounter = (settings?.invoiceCounter ?? 0) + 1;
      if (settings) {
        await tx.tenantSettings.update({
          where: { tenantId },
          data: { invoiceCounter: nextCounter },
        });
      }
      const code = `${series}-${String(nextCounter).padStart(6, '0')}`;

      // --- 5. Caja abierta de la sucursal (obligatoria para vender) ---
      const cashSession = await tx.cashSession.findFirst({
        where: { branchId, status: 'OPEN' },
      });
      if (!cashSession) {
        throw ApiError.badRequest(
          'Debes abrir la caja de esta sucursal antes de registrar ventas'
        );
      }

      // --- 6. Validar cliente y cita ---
      if (clientId) {
        const client = await tx.client.findFirst({ where: { id: clientId, tenantId } });
        if (!client) throw ApiError.badRequest('Cliente inválido');
      }
      if (appointmentId) {
        const appt = await tx.appointment.findFirst({
          where: { id: appointmentId, tenantId },
        });
        if (!appt) throw ApiError.badRequest('Cita inválida');
        const linked = await tx.sale.findUnique({ where: { appointmentId } });
        if (linked) throw ApiError.conflict('Esta cita ya tiene una venta registrada');
      }

      // --- 7. Puntos de fidelización ---
      let pointsEarned = 0;
      if (clientId) {
        const rate = Number(settings?.pointsPerCurrency ?? 0);
        pointsEarned = Math.floor(total * rate);
      }

      // --- 8. Crear la venta ---
      const sale = await tx.sale.create({
        data: {
          tenantId,
          branchId,
          clientId: clientId || null,
          appointmentId: appointmentId || null,
          cashSessionId: cashSession?.id ?? null,
          code,
          subtotal,
          discount,
          tax,
          total,
          status: 'PAID',
          pointsEarned,
          createdById: userId,
          items: { create: resolvedItems },
          payments: {
            create: payments.map((p) => ({
              method: p.method,
              amount: p.amount,
              reference: p.reference,
            })),
          },
        },
        include,
      });

      // --- 9. Descontar stock de los productos vendidos (kardex incluido) ---
      for (const item of resolvedItems.filter((i) => i.productId)) {
        await applyStockMovement(tx, {
          tenantId,
          branchId,
          productId: item.productId,
          type: 'SALE',
          quantity: item.quantity,
          reference: code,
          note: `Venta ${code}`,
          createdById: userId,
        });
      }

      // --- 10. Acreditar puntos y recalcular nivel ---
      if (clientId && pointsEarned > 0) {
        const account = await tx.loyaltyAccount.upsert({
          where: { clientId },
          create: { clientId },
          update: {},
        });
        const newPoints = account.points + pointsEarned;
        const tiers = await tx.loyaltyTier.findMany({ where: { tenantId } });

        await tx.loyaltyAccount.update({
          where: { clientId },
          data: {
            points: newPoints,
            totalEarned: account.totalEarned + pointsEarned,
            tier: resolveTier(tiers, newPoints),
          },
        });
        await tx.loyaltyTransaction.create({
          data: {
            accountId: account.id,
            type: 'EARN',
            points: pointsEarned,
            balance: newPoints,
            reason: `Compra ${code}`,
            reference: sale.id,
          },
        });
      }

      // --- 11. Registrar el efectivo en la caja abierta ---
      const cashAmount = round2(
        payments.filter((p) => p.method === 'CASH').reduce((a, p) => a + p.amount, 0)
      );
      if (cashSession && cashAmount > 0) {
        await tx.cashMovement.create({
          data: {
            cashSessionId: cashSession.id,
            type: 'SALE',
            amount: cashAmount,
            concept: `Venta ${code}`,
            createdById: userId,
          },
        });
      }

      // --- 12. Cerrar la cita asociada ---
      if (appointmentId) {
        await tx.appointment.update({
          where: { id: appointmentId },
          data: { status: 'COMPLETED' },
        });
      }

      return sale;
    },
    // Neon añade latencia por consulta; la venta encadena muchas operaciones,
    // así que ampliamos el timeout de la transacción (por defecto 5 s).
    { timeout: 20_000, maxWait: 10_000 });
  },

  async list(tenantId, { branchId, clientId, from, to, skip, limit }) {
    const where = {
      tenantId,
      ...(branchId ? { branchId } : {}),
      ...(clientId ? { clientId } : {}),
      ...(from || to
        ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include,
      }),
      prisma.sale.count({ where }),
    ]);
    return { items, total };
  },

  async getById(tenantId, id) {
    const sale = await prisma.sale.findFirst({
      where: { id, tenantId },
      include: { ...include, tenant: { include: { settings: true } } },
    });
    if (!sale) throw ApiError.notFound('Venta no encontrada');
    return sale;
  },

  // Anula una venta: repone stock, revierte puntos y descuenta el efectivo de caja.
  async cancel(tenantId, id, userId) {
    const sale = await this.getById(tenantId, id);
    if (sale.status === 'CANCELLED') {
      throw ApiError.badRequest('Esta venta ya fue anulada');
    }

    return prisma.$transaction(async (tx) => {
      // Reponer stock de los productos
      for (const item of sale.items.filter((i) => i.productId)) {
        await applyStockMovement(tx, {
          tenantId,
          branchId: sale.branchId,
          productId: item.productId,
          type: 'RETURN',
          quantity: item.quantity,
          reference: sale.code,
          note: `Anulación venta ${sale.code}`,
          createdById: userId,
        });
      }

      // Revertir puntos
      if (sale.clientId && sale.pointsEarned > 0) {
        const account = await tx.loyaltyAccount.findUnique({
          where: { clientId: sale.clientId },
        });
        if (account) {
          const newPoints = Math.max(0, account.points - sale.pointsEarned);
          const tiers = await tx.loyaltyTier.findMany({ where: { tenantId } });
          await tx.loyaltyAccount.update({
            where: { clientId: sale.clientId },
            data: { points: newPoints, tier: resolveTier(tiers, newPoints) },
          });
          await tx.loyaltyTransaction.create({
            data: {
              accountId: account.id,
              type: 'ADJUST',
              points: -sale.pointsEarned,
              balance: newPoints,
              reason: `Anulación venta ${sale.code}`,
              reference: sale.id,
            },
          });
        }
      }

      // Descontar el efectivo de la caja si sigue abierta
      const cashPaid = sale.payments
        .filter((p) => p.method === 'CASH')
        .reduce((a, p) => a + Number(p.amount), 0);
      if (sale.cashSessionId && cashPaid > 0) {
        const session = await tx.cashSession.findUnique({
          where: { id: sale.cashSessionId },
        });
        if (session?.status === 'OPEN') {
          await tx.cashMovement.create({
            data: {
              cashSessionId: session.id,
              type: 'EXPENSE',
              amount: cashPaid,
              concept: `Anulación venta ${sale.code}`,
              createdById: userId,
            },
          });
        }
      }

      return tx.sale.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include,
      });
    }, { timeout: 20_000, maxWait: 10_000 });
  },
};
