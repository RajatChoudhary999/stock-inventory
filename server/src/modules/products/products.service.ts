import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { HttpError } from '../../utils/httpError';
import type {
  AdjustStockInput,
  CreateProductInput,
  ListMovementsQuery,
  ListProductsQuery,
  UpdateProductInput,
} from './products.schema';

export const productsService = {
  async list(q: ListProductsQuery) {
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(q.categoryId ? { categoryId: q.categoryId } : {}),
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search, mode: 'insensitive' } },
              { sku: { contains: q.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy: { [q.sort]: q.order },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: { category: true, supplier: true },
      }),
    ]);

    return {
      data: items,
      pagination: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) },
    };
  },

  async getById(id: number) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true, supplier: true },
    });
    if (!product) throw HttpError.notFound('Product not found');
    return product;
  },

  async create(input: CreateProductInput) {
    const exists = await prisma.product.findUnique({ where: { sku: input.sku } });
    if (exists) throw HttpError.conflict('SKU_TAKEN', 'A product with this SKU already exists');
    return prisma.product.create({ data: input });
  },

  async update(id: number, input: UpdateProductInput) {
    await this.getById(id); // 404 if missing
    return prisma.product.update({ where: { id }, data: input });
  },

  /** Soft delete — preserves order history that references the product. */
  async remove(id: number) {
    await this.getById(id);
    await prisma.product.update({ where: { id }, data: { isActive: false } });
  },

  async lowStock() {
    // Items at or below their reorder level (raw SQL: column-to-column comparison).
    return prisma.$queryRaw`
      SELECT id, sku, name, quantity_in_stock AS "quantityInStock", reorder_level AS "reorderLevel"
      FROM products
      WHERE is_active = true AND quantity_in_stock <= reorder_level
      ORDER BY quantity_in_stock ASC`;
  },

  /**
   * Adjusts product stock inside an isolated transaction with row-level locking (FOR UPDATE)
   * to guarantee atomic updates, prevent race conditions, and log an immutable audit movement.
   */
  async adjustStock(productId: number, userId: number, input: AdjustStockInput) {
    return prisma.$transaction(async (tx) => {
      // 1. Idempotency protection: prevent accidental duplicate adjustment submissions.
      if (input.idempotencyKey) {
        const recentLogs = await tx.activityLog.findMany({
          where: {
            userId,
            action: 'STOCK_ADJUSTMENT',
            entityId: productId,
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        });

        const duplicate = recentLogs.find(
          (l) => (l.metadata as any)?.idempotencyKey === input.idempotencyKey,
        );

        if (duplicate) {
          const currentProduct = await tx.product.findUnique({
            where: { id: productId },
            include: { category: true, supplier: true },
          });
          return {
            product: currentProduct!,
            movement: null,
            previousStock: (duplicate.metadata as any)?.previousStock ?? currentProduct?.quantityInStock,
            newStock: (duplicate.metadata as any)?.newStock ?? currentProduct?.quantityInStock,
            duplicatePrevented: true,
            message: 'Duplicate adjustment prevented via idempotency key',
          };
        }
      }

      // 2. Concurrency control: Lock the product row with FOR UPDATE.
      const [product] = await tx.$queryRaw<
        { id: number; name: string; quantityInStock: number; reorderLevel: number; isActive: boolean }[]
      >`
        SELECT id, name, quantity_in_stock AS "quantityInStock", reorder_level AS "reorderLevel", is_active AS "isActive"
        FROM products
        WHERE id = ${productId}
        FOR UPDATE
      `;

      if (!product || !product.isActive) {
        throw HttpError.notFound('Product not found');
      }

      const delta = input.type === 'INCREASE' ? input.quantity : -input.quantity;
      const resultingStock = product.quantityInStock + delta;

      if (resultingStock < 0) {
        throw HttpError.conflict(
          'INSUFFICIENT_STOCK',
          `Cannot reduce stock below zero. Current stock is ${product.quantityInStock}, requested reduction is ${input.quantity}.`,
          { currentStock: product.quantityInStock, requestedQuantity: input.quantity },
        );
      }

      // 3. Atomically update product stock.
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { quantityInStock: resultingStock },
        include: { category: true, supplier: true },
      });

      // 4. Create immutable audit ledger movement.
      const movement = await tx.stockMovement.create({
        data: {
          productId,
          changeQty: delta,
          reason: input.reason,
          notes: input.notes?.trim() || null,
          createdById: userId,
        },
        include: {
          createdBy: { select: { id: true, name: true, email: true, role: true } },
        },
      });

      // 5. Record activity log for audit & idempotency tracking.
      await tx.activityLog.create({
        data: {
          userId,
          action: 'STOCK_ADJUSTMENT',
          entity: 'Product',
          entityId: productId,
          metadata: {
            idempotencyKey: input.idempotencyKey ?? null,
            previousStock: product.quantityInStock,
            newStock: resultingStock,
            changeQty: delta,
            reason: input.reason,
            notes: input.notes?.trim() || null,
          },
        },
      });

      // 6. Check for low-stock alert when stock is decreased.
      if (resultingStock <= product.reorderLevel && delta < 0) {
        await tx.notification.create({
          data: {
            type: 'LOW_STOCK',
            message: `"${product.name}" is low on stock (${resultingStock} units remaining)`,
          },
        });
      }

      return {
        product: updatedProduct,
        movement,
        previousStock: product.quantityInStock,
        newStock: resultingStock,
        duplicatePrevented: false,
      };
    });
  },

  /**
   * Retrieves paginated stock movement history for a specific product or across the catalog.
   */
  async getMovements(productId?: number, q: ListMovementsQuery = { page: 1, limit: 20 }) {
    const where: Prisma.StockMovementWhereInput = {
      ...(productId ? { productId } : {}),
      ...(q.reason ? { reason: q.reason } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: {
          product: { select: { id: true, name: true, sku: true } },
          createdBy: { select: { id: true, name: true, email: true, role: true } },
          order: { select: { id: true, orderNumber: true, type: true } },
        },
      }),
    ]);

    return {
      data: items,
      pagination: {
        page: q.page,
        limit: q.limit,
        total,
        totalPages: Math.ceil(total / q.limit),
      },
    };
  },
};

