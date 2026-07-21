import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { applyStockMovement } from './inventory.service.js';

// Aplana el stock de la sucursal consultada (o el total si no se indica).
const withStock = (product, branchId) => {
  const stocks = product.stocks ?? [];
  const stock = branchId
    ? (stocks.find((s) => s.branchId === branchId)?.quantity ?? 0)
    : stocks.reduce((sum, s) => sum + s.quantity, 0);
  const { stocks: _omit, ...rest } = product;
  return { ...rest, stock, lowStock: stock <= product.minStock };
};

export const productService = {
  async list(tenantId, { skip, limit, search, branchId, lowStock, isActive = true }) {
    const where = {
      tenantId,
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } },
              { barcode: { contains: search } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
        include: {
          brand: { select: { id: true, name: true } },
          stocks: branchId ? { where: { branchId } } : true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    let items = rows.map((p) => withStock(p, branchId));
    // El filtro de stock bajo se aplica sobre el stock ya calculado.
    if (lowStock) items = items.filter((p) => p.lowStock);

    return { items, total: lowStock ? items.length : total };
  },

  async getById(tenantId, id, branchId) {
    const product = await prisma.product.findFirst({
      where: { id, tenantId },
      include: { brand: true, supplier: true, stocks: true },
    });
    if (!product) throw ApiError.notFound('Producto no encontrado');
    return withStock(product, branchId);
  },

  async create(tenantId, { initialStock, branchId, ...data }) {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.create({ data: { ...data, tenantId } });

      if (initialStock && branchId) {
        await applyStockMovement(tx, {
          tenantId,
          branchId,
          productId: product.id,
          type: 'INITIAL',
          quantity: initialStock,
          unitCost: data.costPrice,
          note: 'Stock inicial',
        });
      }
      return product;
    }, { timeout: 15_000, maxWait: 8_000 });
  },

  async update(tenantId, id, data) {
    await this.getById(tenantId, id);
    return prisma.product.update({ where: { id }, data });
  },

  async remove(tenantId, id) {
    await this.getById(tenantId, id);
    return prisma.product.update({ where: { id }, data: { isActive: false } });
  },

  // Entrada/salida/ajuste manual de stock.
  async moveStock(tenantId, productId, { branchId, type, quantity, unitCost, note }, userId) {
    await this.getById(tenantId, productId);
    const branch = await prisma.branch.findFirst({ where: { id: branchId, tenantId } });
    if (!branch) throw ApiError.badRequest('Sucursal inválida');

    const balance = await prisma.$transaction((tx) =>
      applyStockMovement(tx, {
        tenantId,
        branchId,
        productId,
        type,
        quantity,
        unitCost,
        note,
        createdById: userId,
      })
    );
    return { productId, branchId, stock: balance };
  },

  // Kardex: historial de movimientos de un producto.
  async kardex(tenantId, productId, { branchId, limit = 100 }) {
    await this.getById(tenantId, productId);
    return prisma.inventoryMovement.findMany({
      where: { tenantId, productId, ...(branchId ? { branchId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { branch: { select: { name: true } } },
    });
  },
};
