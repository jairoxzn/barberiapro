import { prisma } from '../config/prisma.js';

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const endOfToday = () => {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return d;
};
const startOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const dashboardService = {
  async summary(tenantId, branchId) {
    const today0 = startOfToday();
    const today1 = endOfToday();
    const month0 = startOfMonth();
    const branchFilter = branchId ? { branchId } : {};

    const [
      salesToday,
      salesMonth,
      clientsCount,
      newClientsMonth,
      appointmentsToday,
      completedMonth,
      topBarbersRaw,
      topServicesRaw,
    ] = await Promise.all([
      prisma.sale.aggregate({
        where: { tenantId, status: 'PAID', createdAt: { gte: today0, lt: today1 }, ...branchFilter },
        _sum: { total: true },
        _count: true,
      }),
      prisma.sale.aggregate({
        where: { tenantId, status: 'PAID', createdAt: { gte: month0 }, ...branchFilter },
        _sum: { total: true },
        _count: true,
      }),
      prisma.client.count({ where: { tenantId, isActive: true } }),
      prisma.client.count({ where: { tenantId, createdAt: { gte: month0 } } }),
      prisma.appointment.findMany({
        where: { tenantId, startTime: { gte: today0, lt: today1 }, ...branchFilter },
        orderBy: { startTime: 'asc' },
        include: {
          client: { select: { firstName: true, lastName: true } },
          barber: { select: { name: true } },
          services: { include: { service: { select: { name: true } } } },
        },
      }),
      prisma.appointment.count({
        where: { tenantId, status: 'COMPLETED', startTime: { gte: month0 }, ...branchFilter },
      }),
      prisma.appointment.groupBy({
        by: ['barberId'],
        where: { tenantId, status: 'COMPLETED', startTime: { gte: month0 }, ...branchFilter },
        _count: { _all: true },
        _sum: { totalPrice: true },
        orderBy: { _count: { barberId: 'desc' } },
        take: 5,
      }),
      prisma.appointmentService.groupBy({
        by: ['serviceId'],
        where: {
          appointment: { tenantId, status: 'COMPLETED', startTime: { gte: month0 }, ...branchFilter },
        },
        _count: { _all: true },
        _sum: { price: true },
        orderBy: { _count: { serviceId: 'desc' } },
        take: 5,
      }),
    ]);

    // Enriquecer top barberos/servicios con sus nombres.
    const barberIds = topBarbersRaw.map((b) => b.barberId);
    const serviceIds = topServicesRaw.map((s) => s.serviceId);
    const [barbers, services] = await Promise.all([
      prisma.barber.findMany({ where: { id: { in: barberIds } }, select: { id: true, name: true } }),
      prisma.service.findMany({ where: { id: { in: serviceIds } }, select: { id: true, name: true } }),
    ]);
    const barberName = Object.fromEntries(barbers.map((b) => [b.id, b.name]));
    const serviceName = Object.fromEntries(services.map((s) => [s.id, s.name]));

    return {
      salesToday: Number(salesToday._sum.total ?? 0),
      salesTodayCount: salesToday._count,
      salesMonth: Number(salesMonth._sum.total ?? 0),
      salesMonthCount: salesMonth._count,
      clientsCount,
      newClientsMonth,
      servicesDoneMonth: completedMonth,
      appointmentsToday,
      appointmentsTodayCount: appointmentsToday.length,
      topBarbers: topBarbersRaw.map((b) => ({
        id: b.barberId,
        name: barberName[b.barberId] ?? 'N/D',
        count: b._count._all,
        revenue: Number(b._sum.totalPrice ?? 0),
      })),
      topServices: topServicesRaw.map((s) => ({
        id: s.serviceId,
        name: serviceName[s.serviceId] ?? 'N/D',
        count: s._count._all,
        revenue: Number(s._sum.price ?? 0),
      })),
    };
  },
};
