import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

export const serviceService = {
  async list(tenantId, { skip, limit, search, isActive }) {
    const where = {
      tenantId,
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.service.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
        include: { category: { select: { id: true, name: true, color: true } } },
      }),
      prisma.service.count({ where }),
    ]);
    return { items, total };
  },

  async getById(tenantId, id) {
    const svc = await prisma.service.findFirst({
      where: { id, tenantId },
      include: { category: true },
    });
    if (!svc) throw ApiError.notFound('Servicio no encontrado');
    return svc;
  },

  async create(tenantId, data) {
    await this.assertCategory(tenantId, data.categoryId);
    return prisma.service.create({ data: { ...data, tenantId } });
  },

  async update(tenantId, id, data) {
    await this.getById(tenantId, id);
    await this.assertCategory(tenantId, data.categoryId);
    return prisma.service.update({ where: { id }, data });
  },

  async remove(tenantId, id) {
    await this.getById(tenantId, id);
    return prisma.service.update({ where: { id }, data: { isActive: false } });
  },

  async assertCategory(tenantId, categoryId) {
    if (!categoryId) return;
    const cat = await prisma.category.findFirst({
      where: { id: categoryId, tenantId },
    });
    if (!cat) throw ApiError.badRequest('Categoría inválida');
  },
};

export const categoryService = {
  async list(tenantId) {
    return prisma.category.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { services: true } } },
    });
  },

  async create(tenantId, data) {
    return prisma.category.create({ data: { ...data, tenantId } });
  },

  async update(tenantId, id, data) {
    const cat = await prisma.category.findFirst({ where: { id, tenantId } });
    if (!cat) throw ApiError.notFound('Categoría no encontrada');
    return prisma.category.update({ where: { id }, data });
  },

  async remove(tenantId, id) {
    const cat = await prisma.category.findFirst({ where: { id, tenantId } });
    if (!cat) throw ApiError.notFound('Categoría no encontrada');
    await prisma.category.delete({ where: { id } });
  },
};
