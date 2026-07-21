import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

export const branchService = {
  async list(tenantId) {
    return prisma.branch.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { barbers: true } } },
    });
  },

  async getById(tenantId, id) {
    const branch = await prisma.branch.findFirst({ where: { id, tenantId } });
    if (!branch) throw ApiError.notFound('Sucursal no encontrada');
    return branch;
  },

  async create(tenantId, data) {
    return prisma.branch.create({ data: { ...data, tenantId } });
  },

  async update(tenantId, id, data) {
    await this.getById(tenantId, id);
    return prisma.branch.update({ where: { id }, data });
  },

  async remove(tenantId, id) {
    await this.getById(tenantId, id);
    return prisma.branch.update({ where: { id }, data: { isActive: false } });
  },
};
