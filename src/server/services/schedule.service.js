import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

const includeBlock = {
  branch: { select: { id: true, name: true } },
  barber: { select: { id: true, name: true, specialty: true, photoUrl: true } },
};

export const scheduleService = {
  async listBlocks(tenantId, { branchId, barberId, from, to, upcomingOnly }) {
    const now = new Date();
    const where = {
      tenantId,
      ...(branchId ? { branchId } : {}),
      ...(barberId ? { barberId } : {}),
      ...(upcomingOnly === 'true' ? { endTime: { gte: now } } : {}),
      ...(from || to
        ? {
            startTime: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };

    return prisma.scheduleBlock.findMany({
      where,
      orderBy: { startTime: 'asc' },
      include: includeBlock,
    });
  },

  async getBlockById(tenantId, id) {
    const block = await prisma.scheduleBlock.findFirst({
      where: { id, tenantId },
      include: includeBlock,
    });
    if (!block) throw ApiError.notFound('Bloqueo de horario no encontrado');
    return block;
  },

  async createBlock(tenantId, data) {
    if (data.branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: data.branchId, tenantId, isActive: true },
      });
      if (!branch) throw ApiError.badRequest('Sucursal no válida');
    }

    if (data.barberId) {
      const barber = await prisma.barber.findFirst({
        where: { id: data.barberId, tenantId, isActive: true },
      });
      if (!barber) throw ApiError.badRequest('Barbero no válido');
    }

    return prisma.scheduleBlock.create({
      data: {
        tenantId,
        branchId: data.branchId || null,
        barberId: data.barberId || null,
        title: data.title,
        reason: data.reason || null,
        startTime: data.startTime,
        endTime: data.endTime,
        isAllDay: data.isAllDay ?? false,
      },
      include: includeBlock,
    });
  },

  async updateBlock(tenantId, id, data) {
    await this.getBlockById(tenantId, id);

    if (data.branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: data.branchId, tenantId, isActive: true },
      });
      if (!branch) throw ApiError.badRequest('Sucursal no válida');
    }

    if (data.barberId) {
      const barber = await prisma.barber.findFirst({
        where: { id: data.barberId, tenantId, isActive: true },
      });
      if (!barber) throw ApiError.badRequest('Barbero no válido');
    }

    return prisma.scheduleBlock.update({
      where: { id },
      data: {
        ...(data.branchId !== undefined ? { branchId: data.branchId || null } : {}),
        ...(data.barberId !== undefined ? { barberId: data.barberId || null } : {}),
        ...(data.title ? { title: data.title } : {}),
        ...(data.reason !== undefined ? { reason: data.reason || null } : {}),
        ...(data.startTime ? { startTime: data.startTime } : {}),
        ...(data.endTime ? { endTime: data.endTime } : {}),
        ...(data.isAllDay !== undefined ? { isAllDay: data.isAllDay } : {}),
      },
      include: includeBlock,
    });
  },

  async deleteBlock(tenantId, id) {
    await this.getBlockById(tenantId, id);
    return prisma.scheduleBlock.delete({
      where: { id },
    });
  },

  async getSettings(tenantId) {
    let settings = await prisma.tenantSettings.findUnique({
      where: { tenantId },
    });
    if (!settings) {
      settings = await prisma.tenantSettings.create({ data: { tenantId } });
    }

    return {
      slotIntervalMinutes: settings.slotIntervalMinutes ?? 15,
      minAdvanceHours: settings.minAdvanceHours ?? 1,
      maxAdvanceDays: settings.maxAdvanceDays ?? 30,
      bufferMinutes: settings.bufferMinutes ?? 0,
      cancelAdvanceHours: settings.cancelAdvanceHours ?? 2,
    };
  },

  async updateSettings(tenantId, data) {
    const updated = await prisma.tenantSettings.upsert({
      where: { tenantId },
      create: {
        tenantId,
        slotIntervalMinutes: data.slotIntervalMinutes ?? 15,
        minAdvanceHours: data.minAdvanceHours ?? 1,
        maxAdvanceDays: data.maxAdvanceDays ?? 30,
        bufferMinutes: data.bufferMinutes ?? 0,
        cancelAdvanceHours: data.cancelAdvanceHours ?? 2,
      },
      update: {
        ...(data.slotIntervalMinutes !== undefined
          ? { slotIntervalMinutes: data.slotIntervalMinutes }
          : {}),
        ...(data.minAdvanceHours !== undefined
          ? { minAdvanceHours: data.minAdvanceHours }
          : {}),
        ...(data.maxAdvanceDays !== undefined
          ? { maxAdvanceDays: data.maxAdvanceDays }
          : {}),
        ...(data.bufferMinutes !== undefined
          ? { bufferMinutes: data.bufferMinutes }
          : {}),
        ...(data.cancelAdvanceHours !== undefined
          ? { cancelAdvanceHours: data.cancelAdvanceHours }
          : {}),
      },
    });

    return {
      slotIntervalMinutes: updated.slotIntervalMinutes,
      minAdvanceHours: updated.minAdvanceHours,
      maxAdvanceDays: updated.maxAdvanceDays,
      bufferMinutes: updated.bufferMinutes,
      cancelAdvanceHours: updated.cancelAdvanceHours,
    };
  },

  async getOverview(tenantId, { branchId } = {}) {
    const [settings, branches, barbers, upcomingBlocks] = await Promise.all([
      this.getSettings(tenantId),
      prisma.branch.findMany({
        where: { tenantId, isActive: true },
        include: { _count: { select: { barbers: true } } },
      }),
      prisma.barber.findMany({
        where: {
          tenantId,
          isActive: true,
          ...(branchId ? { branchId } : {}),
        },
        include: {
          branch: { select: { id: true, name: true } },
          schedules: { orderBy: { weekday: 'asc' } },
          timeOffs: { orderBy: { startDate: 'asc' } },
        },
      }),
      prisma.scheduleBlock.findMany({
        where: {
          tenantId,
          endTime: { gte: new Date() },
          ...(branchId ? { branchId } : {}),
        },
        orderBy: { startTime: 'asc' },
        take: 20,
        include: includeBlock,
      }),
    ]);

    return {
      settings,
      branches,
      barbers,
      upcomingBlocks,
    };
  },
};
