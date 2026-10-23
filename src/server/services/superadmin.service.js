import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { hashPassword } from '../utils/password.js';
import { signAccessToken } from '../utils/jwt.js';

const slugify = (str) =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

export const superadminService = {
  /**
   * Métricas generales de la plataforma SaaS completa
   */
  async getMetrics() {
    const [
      totalTenants,
      activeTenants,
      totalBarbers,
      totalClients,
      totalAppointments,
      totalSalesAgg,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { isActive: true } }),
      prisma.barber.count(),
      prisma.client.count(),
      prisma.appointment.count(),
      prisma.sale.aggregate({
        where: { status: 'PAID' },
        _sum: { total: true },
        _count: { id: true },
      }),
    ]);

    const suspendedTenants = totalTenants - activeTenants;
    const totalRevenue = Number(totalSalesAgg._sum?.total || 0);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newTenantsThisMonth = await prisma.tenant.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    return {
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalBarbers,
      totalClients,
      totalAppointments,
      totalRevenue,
      paidSalesCount: totalSalesAgg._count?.id || 0,
      newTenantsThisMonth,
    };
  },

  /**
   * Listado de barberías con filtros y estadísticas por cada una
   */
  async listTenants({ search, status, page = 1, limit = 50 }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
    const where = {};

    if (status === 'active') where.isActive = true;
    if (status === 'suspended') where.isActive = false;

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { slug: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, tenants] = await Promise.all([
      prisma.tenant.count({ where }),
      prisma.tenant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          settings: { select: { currency: true, timezone: true } },
          _count: {
            select: {
              branches: true,
              barbers: true,
              clients: true,
              appointments: true,
              sales: true,
            },
          },
          users: {
            where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
            select: { id: true, name: true, email: true, lastLoginAt: true },
            take: 1,
          },

        },
      }),
    ]);

    const tenantIds = tenants.map((t) => t.id);
    const salesByTenant = await prisma.sale.groupBy({
      by: ['tenantId'],
      where: { tenantId: { in: tenantIds }, status: 'PAID' },
      _sum: { total: true },
    });

    const salesMap = Object.fromEntries(
      salesByTenant.map((s) => [s.tenantId, Number(s._sum.total || 0)])
    );

    const data = tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      email: t.email,
      phone: t.phone,
      logoUrl: t.logoUrl,
      isActive: t.isActive,
      createdAt: t.createdAt,
      currency: t.settings?.currency || 'PEN',
      branchesCount: t._count.branches,
      barbersCount: t._count.barbers,
      clientsCount: t._count.clients,
      appointmentsCount: t._count.appointments,
      salesCount: t._count.sales,
      totalSales: salesMap[t.id] || 0,
      admin: t.users[0] || null,
    }));

    return {
      data,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  },

  /**
   * Detalle completo de una barbería
   */
  async getTenantById(id) {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        settings: true,
        branches: {
          select: { id: true, name: true, address: true, phone: true, isActive: true },
        },
        barbers: {
          select: { id: true, name: true, specialty: true, isActive: true, commissionRate: true },
        },
        users: {
          select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true },
        },
        _count: {
          select: {
            clients: true,
            appointments: true,
            sales: true,
            products: true,
          },
        },
      },
    });

    if (!tenant) throw ApiError.notFound('Barbería no encontrada');

    const salesTotal = await prisma.sale.aggregate({
      where: { tenantId: id, status: 'PAID' },
      _sum: { total: true },
    });

    return {
      ...tenant,
      totalSales: Number(salesTotal._sum?.total || 0),
    };
  },

  /**
   * Crear una nueva barbería manualmente desde el panel SaaS
   */
  async createTenant({ businessName, name, email, password, phone, currency = 'PEN' }) {
    const passwordHash = await hashPassword(password);
    let slug = slugify(businessName) || 'barberia';

    const existing = await prisma.tenant.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const tenant = await prisma.$transaction(async (tx) => {
      const createdTenant = await tx.tenant.create({
        data: {
          name: businessName,
          slug,
          email,
          phone,
          settings: {
            create: {
              currency,
            },
          },
          branches: {
            create: { name: 'Sucursal Principal' },
          },
          loyaltyTiers: {
            create: [
              { level: 'BRONZE', name: 'Bronce', minPoints: 0 },
              { level: 'SILVER', name: 'Plata', minPoints: 500 },
              { level: 'GOLD', name: 'Oro', minPoints: 1500 },
              { level: 'PLATINUM', name: 'Platino', minPoints: 4000 },
              { level: 'DIAMOND', name: 'Diamante', minPoints: 10000 },
            ],
          },
        },
        include: { branches: true },
      });

      await tx.user.create({
        data: {
          tenantId: createdTenant.id,
          branchId: createdTenant.branches[0].id,
          name,
          email,
          passwordHash,
          role: 'ADMIN',
        },
      });

      return createdTenant;
    });

    return this.getTenantById(tenant.id);
  },

  /**
   * Cambiar estado activo/suspendido de una barbería
   */
  async toggleTenantStatus(id, isActive) {
    const existing = await prisma.tenant.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Barbería no encontrada');

    const updated = await prisma.tenant.update({
      where: { id },
      data: { isActive },
    });

    return updated;
  },

  /**
   * Impersonación (soporte técnico): Generar token de acceso para entrar a la barbería seleccionada
   */
  async impersonateTenant(id) {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        branches: { take: 1 },
        users: { where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, isActive: true }, take: 1 },
      },

    });

    if (!tenant) throw ApiError.notFound('Barbería no encontrada');

    const targetUser = tenant.users[0];
    if (!targetUser) {
      throw ApiError.badRequest('Esta barbería no tiene un usuario administrador activo');
    }

    const payload = {
      sub: targetUser.id,
      tenantId: tenant.id,
      role: targetUser.role,
      branchId: targetUser.branchId || tenant.branches[0]?.id || null,
    };

    const accessToken = signAccessToken(payload);

    return {
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        tenantId: tenant.id,
        branchId: targetUser.branchId,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
      accessToken,
    };
  },
};
