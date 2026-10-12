import { Prisma, OrderStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { HttpError } from '../../utils/httpError';
import type { CreateOrderInput, ListOrdersQuery } from './orders.schema';

// Allowed status transitions — prevents e.g. reviving a cancelled order.
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['FULFILLED', 'CANCELLED'],
  FULFILLED: [],
  CANCELLED: [],
};

export const ordersService = {
  /**
   * Creates an order and adjusts stock ATOMICALLY.
   *
   * A SALE decrements stock; a PURCHASE increments it. All writes — order,
   * order_items, product quantity updates, and the stock_movement ledger rows —
   * happen inside a single transaction. If any product has insufficient stock,
   * the whole transaction rolls back and nothing changes. This guarantees the
   * database can never end up with a "half-applied" order or negative stock.
   */
  async create(userId: number, input: CreateOrderInput) {
    return prisma.$transaction(async (tx) => {
      const productIds = input.items.map((i) => i.productId);
      const products = await tx.product.findMany({ where: { id: { in: productIds } } });
      const byId = new Map(products.map((p) => [p.id, p]));

      // Validate every line before mutating anything.
      for (const item of input.items) {
        const product = byId.get(item.productId);
        if (!product || !product.isActive) {
          throw HttpError.badRequest(`Product ${item.productId} not found`);
        }
        if (input.type === 'SALE' && product.quantityInStock < item.quantity) {
          throw HttpError.conflict('INSUFFICIENT_STOCK', `Not enough stock for "${product.name}"`, {
            productId: product.id,
            available: product.quantityInStock,
            requested: item.quantity,
          });
        }
      }

      const totalAmount = input.items.reduce((sum, item) => {
        const product = byId.get(item.productId)!;
        const price = input.type === 'SALE' ? product.unitPrice : product.costPrice;
        return sum + Number(price) * item.quantity;
      }, 0);

      const order = await tx.order.create({
        data: {
          orderNumber: await this.nextOrderNumber(tx, input.type),
          type: input.type,
          status: 'CONFIRMED',
          supplierId: input.supplierId,
          customerName: input.customerName,
          totalAmount,
          createdById: userId,
          items: {
            create: input.items.map((item) => {
              const product = byId.get(item.productId)!;
              const price = input.type === 'SALE' ? product.unitPrice : product.costPrice;
              return {
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: price,
                lineTotal: Number(price) * item.quantity,
              };
            }),
          },
        },
        include: { items: true },
      });

      // Apply stock changes + write the immutable ledger row for each item.
      for (const item of input.items) {
        const delta = input.type === 'SALE' ? -item.quantity : item.quantity;
        await tx.product.update({
          where: { id: item.productId },
          data: { quantityInStock: { increment: delta } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            changeQty: delta,
            reason: input.type,
            referenceOrderId: order.id,
            createdById: userId,
          },
        });
      }

      // Low-stock notifications (checked after decrement).
      if (input.type === 'SALE') {
        for (const item of input.items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (product && product.quantityInStock <= product.reorderLevel) {
            await tx.notification.create({
              data: {
                type: 'LOW_STOCK',
                message: `"${product.name}" is low on stock (${product.quantityInStock} left)`,
              },
            });
          }
        }
      }

      return order;
    });
  },

  async nextOrderNumber(tx: Prisma.TransactionClient, type: CreateOrderInput['type']) {
    const prefix = type === 'SALE' ? 'SO' : 'PO';
    const count = await tx.order.count({ where: { type } });
    return `${prefix}-${String(count + 1).padStart(6, '0')}`;
  },

  async list(q: ListOrdersQuery) {
    const where: Prisma.OrderWhereInput = {
      ...(q.type ? { type: q.type } : {}),
      ...(q.status ? { status: q.status } : {}),
    };
    const [total, data] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: { createdBy: { select: { id: true, name: true } }, _count: { select: { items: true } } },
      }),
    ]);
    return {
      data,
      pagination: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) },
    };
  },

  async getById(id: number) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } }, createdBy: { select: { id: true, name: true } }, supplier: true },
    });
    if (!order) throw HttpError.notFound('Order not found');
    return order;
  },

  /**
   * Updates status with transition validation. Cancelling a non-fulfilled order
   * restores stock (reverses the movements) — again inside a transaction.
   */
  async updateStatus(id: number, next: OrderStatus, userId: number) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
      if (!order) throw HttpError.notFound('Order not found');

      if (!TRANSITIONS[order.status].includes(next)) {
        throw HttpError.conflict('INVALID_TRANSITION', `Cannot change status from ${order.status} to ${next}`);
      }

      if (next === 'CANCELLED') {
        // Reverse the original stock effect.
        for (const item of order.items) {
          const restore = order.type === 'SALE' ? item.quantity : -item.quantity;
          await tx.product.update({
            where: { id: item.productId },
            data: { quantityInStock: { increment: restore } },
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              changeQty: restore,
              reason: order.type === 'SALE' ? 'RETURN' : 'ADJUSTMENT',
              referenceOrderId: order.id,
              createdById: userId,
            },
          });
        }
      }

      return tx.order.update({ where: { id }, data: { status: next } });
    });
  },
};
