import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { appointmentService } from './appointment.service.js';
import {
  hhmmToMinutes,
  minutesOfDay,
  addMinutes,
  overlaps,
} from '../utils/time.js';

const SLOT_STEP = 15; // minutos entre inicios de slot ofrecidos
const BLOCKING = ['RESERVED', 'CONFIRMED', 'COMPLETED', 'RESCHEDULED'];

// Devuelve la ficha Client vinculada a la cuenta de usuario (rol CLIENT).
const getMyClient = async (tenantId, userId) => {
  const client = await prisma.client.findFirst({
    where: { tenantId, userId },
    include: { loyaltyAccount: true },
  });
  if (!client) throw ApiError.notFound('No se encontró tu ficha de cliente');
  return client;
};

// Construye una fecha local a partir de 'yyyy-mm-dd' + minutos del día.
const dateAtMinutes = (dateStr, minutes) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime() + minutes * 60_000;
};

export const bookingService = {
  async me(tenantId, userId) {
    const client = await getMyClient(tenantId, userId);
    return {
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      phone: client.phone,
      email: client.email,
      points: client.loyaltyAccount?.points ?? 0,
      tier: client.loyaltyAccount?.tier ?? 'BRONZE',
    };
  },

  // Slots disponibles para un barbero en una fecha, dado el total de servicios.
  async availability(tenantId, { barberId, date, serviceIds }) {
    const barber = await prisma.barber.findFirst({
      where: { id: barberId, tenantId, isActive: true },
      include: { schedules: true, timeOffs: true },
    });
    if (!barber) throw ApiError.badRequest('Barbero no disponible');

    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds }, tenantId, isActive: true },
      select: { durationMinutes: true },
    });
    if (!services.length) throw ApiError.badRequest('Selecciona al menos un servicio');
    const duration = services.reduce((a, s) => a + s.durationMinutes, 0);

    // Día de la semana de la fecha solicitada (hora local).
    const [y, m, d] = date.split('-').map(Number);
    const weekday = new Date(y, m - 1, d).getDay();
    const schedule = barber.schedules.find((s) => s.weekday === weekday && s.isActive);
    if (!schedule) return { date, duration, slots: [] };

    // ¿La fecha cae en vacaciones/día libre?
    const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0);
    const dayEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
    const onTimeOff = barber.timeOffs.some(
      (t) => dayStart <= t.endDate && dayEnd >= t.startDate
    );
    if (onTimeOff) return { date, duration, slots: [] };

    // Citas que ocupan la agenda ese día.
    const existing = await prisma.appointment.findMany({
      where: {
        barberId,
        status: { in: BLOCKING },
        startTime: { gte: dayStart, lte: dayEnd },
      },
      select: { startTime: true, endTime: true },
    });

    const schedStart = hhmmToMinutes(schedule.startTime);
    const schedEnd = hhmmToMinutes(schedule.endTime);
    const now = Date.now();

    const slots = [];
    for (let start = schedStart; start + duration <= schedEnd; start += SLOT_STEP) {
      const startMs = dateAtMinutes(date, start);
      const endMs = startMs + duration * 60_000;

      if (startMs < now) continue; // no ofrecer horas pasadas

      const clash = existing.some((a) =>
        overlaps(new Date(startMs), new Date(endMs), a.startTime, a.endTime)
      );
      if (clash) continue;

      const hh = String(Math.floor(start / 60)).padStart(2, '0');
      const mm = String(start % 60).padStart(2, '0');
      slots.push({ time: `${hh}:${mm}`, iso: new Date(startMs).toISOString() });
    }

    return { date, duration, slots };
  },

  // El cliente reserva para sí mismo (reutiliza la validación de la agenda).
  async book(tenantId, userId, { branchId, barberId, serviceIds, startTime, notes }) {
    const client = await getMyClient(tenantId, userId);
    return appointmentService.create(tenantId, {
      branchId,
      barberId,
      serviceIds,
      startTime,
      notes,
      clientId: client.id,
    });
  },

  async myAppointments(tenantId, userId) {
    const client = await getMyClient(tenantId, userId);
    return prisma.appointment.findMany({
      where: { tenantId, clientId: client.id },
      orderBy: { startTime: 'desc' },
      take: 50,
      include: {
        barber: { select: { name: true } },
        branch: { select: { name: true } },
        services: { include: { service: { select: { name: true } } } },
      },
    });
  },

  async cancel(tenantId, userId, appointmentId) {
    const client = await getMyClient(tenantId, userId);
    const appt = await prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId, clientId: client.id },
    });
    if (!appt) throw ApiError.notFound('Cita no encontrada');
    if (!['RESERVED', 'CONFIRMED'].includes(appt.status)) {
      throw ApiError.badRequest('Esta cita ya no se puede cancelar');
    }
    if (appt.startTime < new Date()) {
      throw ApiError.badRequest('No puedes cancelar una cita pasada');
    }
    return prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CANCELLED' },
    });
  },
};
