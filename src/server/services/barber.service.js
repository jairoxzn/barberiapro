import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

export const barberService = {
  async list(tenantId, { skip, limit, search, isActive }) {
    const where = {
      tenantId,
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.barber.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
        include: {
          branch: { select: { id: true, name: true } },
          schedules: true,
        },
      }),
      prisma.barber.count({ where }),
    ]);
    return { items, total };
  },

  async getById(tenantId, id) {
    const barber = await prisma.barber.findFirst({
      where: { id, tenantId },
      include: {
        branch: { select: { id: true, name: true } },
        schedules: { orderBy: { weekday: 'asc' } },
        timeOffs: { orderBy: { startDate: 'desc' } },
      },
    });
    if (!barber) throw ApiError.notFound('Barbero no encontrado');
    return barber;
  },

  async create(tenantId, data) {
    await this.assertBranch(tenantId, data.branchId);
    return prisma.barber.create({ data: { ...data, tenantId } });
  },

  async update(tenantId, id, data) {
    await this.getById(tenantId, id);
    await this.assertBranch(tenantId, data.branchId);
    return prisma.barber.update({ where: { id }, data });
  },

  async remove(tenantId, id) {
    await this.getById(tenantId, id);
    return prisma.barber.update({ where: { id }, data: { isActive: false } });
  },

  // Reemplaza el horario semanal completo.
  async setSchedule(tenantId, id, schedules) {
    await this.getById(tenantId, id);
    await prisma.$transaction([
      prisma.barberSchedule.deleteMany({ where: { barberId: id } }),
      prisma.barberSchedule.createMany({
        data: schedules.map((s) => ({ ...s, barberId: id })),
      }),
    ]);
    return this.getById(tenantId, id);
  },

  async addTimeOff(tenantId, id, data) {
    await this.getById(tenantId, id);
    return prisma.barberTimeOff.create({ data: { ...data, barberId: id } });
  },

  async removeTimeOff(tenantId, id, timeOffId) {
    await this.getById(tenantId, id);
    await prisma.barberTimeOff.deleteMany({
      where: { id: timeOffId, barberId: id },
    });
  },

  async assertBranch(tenantId, branchId) {
    if (!branchId) return;
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, tenantId },
    });
    if (!branch) throw ApiError.badRequest('Sucursal inválida');
  },
};
