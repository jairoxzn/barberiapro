import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

export const publicService = {
  // Información pública de una barbería por su slug (para el portal de reserva).
  async barbershopBySlug(slug) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      include: {
        settings: { select: { currency: true, primaryColor: true } },
        branches: {
          where: { isActive: true },
          select: { id: true, name: true, address: true, phone: true },
        },
      },
    });
    if (!tenant || !tenant.isActive) {
      throw ApiError.notFound('Barbería no encontrada');
    }

    const [services, barbers] = await Promise.all([
      prisma.service.findMany({
        where: { tenantId: tenant.id, isActive: true },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          durationMinutes: true,
          price: true,
          color: true,
          imageUrl: true,
          category: { select: { name: true } },
        },
      }),
      prisma.barber.findMany({
        where: { tenantId: tenant.id, isActive: true },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          specialty: true,
          photoUrl: true,
          branchId: true,
        },
      }),
    ]);

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      logoUrl: tenant.logoUrl,
      phone: tenant.phone,
      currency: tenant.settings?.currency ?? 'PEN',
      primaryColor: tenant.settings?.primaryColor ?? '#6366f1',
      branches: tenant.branches,
      services,
      barbers,
    };
  },
};
