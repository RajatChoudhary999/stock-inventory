import { prisma } from '../../config/prisma';

/**
 * Dashboard KPIs. Uses raw parameterized SQL for the aggregates — this is where
 * SQL is clearer and faster than an ORM, and it demonstrates real query skill.
 */
export const dashboardService = {
  async summary() {
    const [totals] = await prisma.$queryRaw<
      { totalProducts: bigint; lowStockCount: bigint; stockValue: number }[]
    >`
      SELECT
        COUNT(*)                                            AS "totalProducts",
        COUNT(*) FILTER (WHERE quantity_in_stock <= reorder_level) AS "lowStockCount",
        COALESCE(SUM(quantity_in_stock * cost_price), 0)    AS "stockValue"
      FROM products
      WHERE is_active = true`;

    const [sales] = await prisma.$queryRaw<{ salesOrders: bigint; salesRevenue: number }[]>`
      SELECT COUNT(*) AS "salesOrders", COALESCE(SUM(total_amount), 0) AS "salesRevenue"
      FROM orders
      WHERE type = 'SALE' AND status <> 'CANCELLED'`;

    // Top 5 products by units sold (join orders + order_items).
    const topProducts = await prisma.$queryRaw`
      SELECT p.id, p.name, SUM(oi.quantity)::int AS "unitsSold",
             SUM(oi.line_total) AS "revenue"
      FROM order_items oi
      JOIN orders o   ON o.id = oi.order_id AND o.type = 'SALE' AND o.status <> 'CANCELLED'
      JOIN products p ON p.id = oi.product_id
      GROUP BY p.id, p.name
      ORDER BY "unitsSold" DESC
      LIMIT 5`;

    // Sales revenue by day for the last 14 days (for a trend chart).
    const salesTrend = await prisma.$queryRaw`
      SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
             SUM(total_amount) AS revenue
      FROM orders
      WHERE type = 'SALE' AND status <> 'CANCELLED'
        AND created_at >= now() - interval '14 days'
      GROUP BY 1 ORDER BY 1`;

    return {
      totalProducts: Number(totals.totalProducts),
      lowStockCount: Number(totals.lowStockCount),
      stockValue: Number(totals.stockValue),
      salesOrders: Number(sales.salesOrders),
      salesRevenue: Number(sales.salesRevenue),
      topProducts,
      salesTrend,
    };
  },
};
