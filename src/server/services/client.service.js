import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

export const clientService = {
  async list(tenantId, { skip, limit, search, isActive }) {
    const where = {
      tenantId,
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { dni: { contains: search } },
              { phone: { contains: search } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { loyaltyAccount: { select: { points: true, tier: true } } },
      }),
      prisma.client.count({ where }),
    ]);

    return { items, total };
  },

  async getById(tenantId, id) {
    const client = await prisma.client.findFirst({
      where: { id, tenantId },
      include: { loyaltyAccount: true },
    });
    if (!client) throw ApiError.notFound('Cliente no encontrado');
    return client;
  },

  async create(tenantId, data) {
    return prisma.client.create({
      data: {
        ...data,
        tenantId,
        loyaltyAccount: { create: {} }, // cuenta de puntos automática
      },
      include: { loyaltyAccount: true },
    });
  },

  async update(tenantId, id, data) {
    await this.getById(tenantId, id);
    return prisma.client.update({ where: { id }, data });
  },

  async remove(tenantId, id) {
    await this.getById(tenantId, id);
    // Baja lógica para preservar historial.
    return prisma.client.update({
      where: { id },
      data: { isActive: false },
    });
  },

  // Historial completo del cliente: citas, ventas, puntos, métricas.
  async history(tenantId, id) {
    const client = await this.getById(tenantId, id);

    const [appointments, sales, loyaltyTxns, agg] = await Promise.all([
      prisma.appointment.findMany({
        where: { tenantId, clientId: id },
        orderBy: { startTime: 'desc' },
        take: 50,
        include: {
          barber: { select: { name: true } },
          services: { include: { service: { select: { name: true } } } },
        },
      }),
      prisma.sale.findMany({
        where: { tenantId, clientId: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { items: true },
      }),
      client.loyaltyAccount
        ? prisma.loyaltyTransaction.findMany({
            where: { accountId: client.loyaltyAccount.id },
            orderBy: { createdAt: 'desc' },
            take: 50,
          })
        : Promise.resolve([]),
      prisma.sale.aggregate({
        where: { tenantId, clientId: id, status: 'PAID' },
        _sum: { total: true },
        _count: true,
      }),
    ]);

    const completedCount = appointments.filter(
      (a) => a.status === 'COMPLETED'
    ).length;
    const lastVisit = appointments.find((a) => a.status === 'COMPLETED')?.startTime
      || appointments[0]?.startTime
      || null;

    return {
      client,
      metrics: {
        totalSpent: agg._sum.total ?? 0,
        totalSales: agg._count,
        totalAppointments: appointments.length,
        completedAppointments: completedCount,
        points: client.loyaltyAccount?.points ?? 0,
        tier: client.loyaltyAccount?.tier ?? 'BRONZE',
        lastVisit,
      },
      appointments,
      sales,
      loyaltyTransactions: loyaltyTxns,
    };
  },
};
