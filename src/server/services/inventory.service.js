import { ApiError } from '../utils/ApiError.js';

// Movimientos que suman stock; el resto resta.
const INBOUND = ['PURCHASE', 'ADJUSTMENT_IN', 'TRANSFER_IN', 'INITIAL', 'RETURN'];

export const isInbound = (type) => INBOUND.includes(type);

/**
 * Aplica un movimiento de inventario dentro de una transacción Prisma.
 * Actualiza el stock de la sucursal y registra el movimiento en el kardex.
 * Debe recibir SIEMPRE el cliente transaccional (`tx`) para garantizar atomicidad.
 *
 * @param tx        cliente Prisma transaccional
 * @param quantity  cantidad en positivo; el signo lo determina `type`
 */
export const applyStockMovement = async (
  tx,
  { tenantId, branchId, productId, type, quantity, unitCost, reference, note, createdById }
) => {
  if (quantity <= 0) throw ApiError.badRequest('La cantidad debe ser mayor a 0');

  const inbound = isInbound(type);
  const delta = inbound ? quantity : -quantity;

  // Bloquea/crea la fila de stock de esta sucursal.
  const stock = await tx.productStock.upsert({
    where: { productId_branchId: { productId, branchId } },
    create: { productId, branchId, quantity: 0 },
    update: {},
  });

  const balanceAfter = stock.quantity + delta;

  if (balanceAfter < 0) {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { name: true },
    });
    throw ApiError.badRequest(
      `Stock insuficiente de "${product?.name ?? 'producto'}": disponible ${stock.quantity}, solicitado ${quantity}`
    );
  }

  await tx.productStock.update({
    where: { productId_branchId: { productId, branchId } },
    data: { quantity: balanceAfter },
  });

  await tx.inventoryMovement.create({
    data: {
      tenantId,
      branchId,
      productId,
      type,
      quantity: delta,
      balanceAfter,
      unitCost,
      reference,
      note,
      createdById,
    },
  });

  return balanceAfter;
};
