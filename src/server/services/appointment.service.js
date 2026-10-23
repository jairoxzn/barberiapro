import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import {
  minutesOfDay,
  hhmmToMinutes,
  addMinutes,
  weekday,
  overlaps,
} from '../utils/time.js';

// Estados que ocupan la agenda (bloquean el horario del barbero).
const BLOCKING = ['RESERVED', 'CONFIRMED', 'COMPLETED', 'RESCHEDULED'];

const includeFull = {
  client: { select: { id: true, firstName: true, lastName: true, phone: true } },
  barber: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
  services: { include: { service: { select: { id: true, name: true, color: true } } } },
};

const loadServices = async (tenantId, serviceIds) => {
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds }, tenantId, isActive: true },
  });
  if (services.length !== serviceIds.length) {
    throw ApiError.badRequest('Uno o más servicios no son válidos');
  }
  const totalDuration = services.reduce((s, x) => s + x.durationMinutes, 0);
  const totalPrice = services.reduce((s, x) => s + Number(x.price), 0);
  return { services, totalDuration, totalPrice };
};

// Valida horario del barbero, día libre y solapes. Lanza ApiError si no procede.
const assertAvailability = async ({
  tenantId,
  barberId,
  branchId,
  startTime,
  endTime,
  excludeAppointmentId,
}) => {
  if (startTime < new Date()) {
    throw ApiError.badRequest('No puedes reservar en una fecha/hora pasada');
  }

  const barber = await prisma.barber.findFirst({
    where: { id: barberId, tenantId, isActive: true },
    include: { schedules: true, timeOffs: true },
  });
  if (!barber) throw ApiError.badRequest('Barbero no disponible');

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, tenantId, isActive: true },
  });
  if (!branch) throw ApiError.badRequest('Sucursal no válida');

  // 1) Día laborable del barbero según su horario semanal.
  const wd = weekday(startTime);
  const schedule = barber.schedules.find((s) => s.weekday === wd && s.isActive);
  if (!schedule) {
    throw ApiError.badRequest('El barbero no trabaja ese día');
  }

  // 2) Dentro del turno del barbero.
  const startMin = minutesOfDay(startTime);
  const endMin = minutesOfDay(endTime);
  const schedStart = hhmmToMinutes(schedule.startTime);
  const schedEnd = hhmmToMinutes(schedule.endTime);
  // endMin puede ser 0 si termina a medianoche; sólo importa si cruza el día (no soportado aquí).
  if (startMin < schedStart || endMin > schedEnd || endMin <= startMin) {
    throw ApiError.badRequest(
      `Fuera del horario del barbero (${schedule.startTime} - ${schedule.endTime})`
    );
  }

  // 3) Vacaciones / días libres.
  const onTimeOff = barber.timeOffs.some(
    (t) => startTime >= t.startDate && startTime <= t.endDate
  );
  if (onTimeOff) throw ApiError.badRequest('El barbero está de vacaciones/día libre');

  // 3.1) Bloqueos de horario (almuerzos, reuniones, feriados, etc.)
  const clashBlock = await prisma.scheduleBlock.findFirst({
    where: {
      tenantId,
      AND: [
        {
          OR: [
            { barberId },
            { branchId, barberId: null },
            { branchId: null, barberId: null },
          ],
        },
        {
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      ],
    },
  });
  if (clashBlock) {
    throw ApiError.conflict(
      `El horario está bloqueado: ${clashBlock.title}${clashBlock.reason ? ` (${clashBlock.reason})` : ''}`
    );
  }

  // 4) Solapes con otras citas del mismo barbero.
  const sameDayStart = new Date(startTime);
  sameDayStart.setHours(0, 0, 0, 0);
  const sameDayEnd = new Date(sameDayStart);
  sameDayEnd.setDate(sameDayEnd.getDate() + 1);

  const existing = await prisma.appointment.findMany({
    where: {
      barberId,
      status: { in: BLOCKING },
      startTime: { gte: sameDayStart, lt: sameDayEnd },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    select: { startTime: true, endTime: true },
  });

  const clash = existing.some((a) =>
    overlaps(startTime, endTime, a.startTime, a.endTime)
  );
  if (clash) throw ApiError.conflict('El horario ya está ocupado para ese barbero');

  return barber;
};

export const appointmentService = {
  async agenda(tenantId, { branchId, barberId, from, to, status }) {
    const where = {
      tenantId,
      ...(branchId ? { branchId } : {}),
      ...(barberId ? { barberId } : {}),
      ...(status ? { status } : {}),
      ...(from || to
        ? {
            startTime: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };
    return prisma.appointment.findMany({
      where,
      orderBy: { startTime: 'asc' },
      include: includeFull,
    });
  },

  async getById(tenantId, id) {
    const appt = await prisma.appointment.findFirst({
      where: { id, tenantId },
      include: includeFull,
    });
    if (!appt) throw ApiError.notFound('Cita no encontrada');
    return appt;
  },

  async create(tenantId, data) {
    const { services, totalDuration, totalPrice } = await loadServices(
      tenantId,
      data.serviceIds
    );
    const startTime = data.startTime;
    const endTime = addMinutes(startTime, totalDuration);

    await assertAvailability({
      tenantId,
      barberId: data.barberId,
      branchId: data.branchId,
      startTime,
      endTime,
    });

    if (data.clientId) {
      const client = await prisma.client.findFirst({
        where: { id: data.clientId, tenantId },
      });
      if (!client) throw ApiError.badRequest('Cliente no válido');
    }

    return prisma.appointment.create({
      data: {
        tenantId,
        branchId: data.branchId,
        barberId: data.barberId,
        clientId: data.clientId || null,
        startTime,
        endTime,
        notes: data.notes,
        totalPrice,
        services: {
          create: services.map((s) => ({
            serviceId: s.id,
            price: s.price,
            durationMinutes: s.durationMinutes,
          })),
        },
      },
      include: includeFull,
    });
  },

  async update(tenantId, id, data) {
    const current = await this.getById(tenantId, id);
    if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(current.status)) {
      throw ApiError.badRequest('No se puede modificar una cita finalizada o cancelada');
    }

    const barberId = data.barberId || current.barberId;
    let totalDuration;
    let totalPrice = Number(current.totalPrice);
    let servicesData;

    if (data.serviceIds) {
      const loaded = await loadServices(tenantId, data.serviceIds);
      totalDuration = loaded.totalDuration;
      totalPrice = loaded.totalPrice;
      servicesData = loaded.services;
    } else {
      totalDuration = current.services.reduce((s, x) => s + x.durationMinutes, 0);
    }

    const startTime = data.startTime || current.startTime;
    const endTime = addMinutes(startTime, totalDuration);

    await assertAvailability({
      tenantId,
      barberId,
      branchId: current.branchId,
      startTime,
      endTime,
      excludeAppointmentId: id,
    });

    return prisma.$transaction(async (tx) => {
      if (servicesData) {
        await tx.appointmentService.deleteMany({ where: { appointmentId: id } });
        await tx.appointmentService.createMany({
          data: servicesData.map((s) => ({
            appointmentId: id,
            serviceId: s.id,
            price: s.price,
            durationMinutes: s.durationMinutes,
          })),
        });
      }
      return tx.appointment.update({
        where: { id },
        data: {
          barberId,
          clientId: data.clientId ?? current.clientId,
          startTime,
          endTime,
          notes: data.notes ?? current.notes,
          totalPrice,
        },
        include: includeFull,
      });
    });
  },

  async changeStatus(tenantId, id, status) {
    await this.getById(tenantId, id);
    return prisma.appointment.update({
      where: { id },
      data: { status },
      include: includeFull,
    });
  },

  async remove(tenantId, id) {
    await this.getById(tenantId, id);
    // Cancelación lógica (mantiene el registro para reportes).
    return prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  },
};
