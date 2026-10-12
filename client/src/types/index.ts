export type Role = 'ADMIN' | 'MANAGER' | 'STAFF';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description?: string | null;
  unitPrice: string;
  costPrice: string;
  quantityInStock: number;
  reorderLevel: number;
  category?: { id: number; name: string } | null;
  supplier?: { id: number; name: string } | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  type: 'SALE' | 'PURCHASE';
  status: 'PENDING' | 'CONFIRMED' | 'FULFILLED' | 'CANCELLED';
  totalAmount: string;
  customerName?: string | null;
  createdAt: string;
  createdBy?: { id: number; name: string };
  _count?: { items: number };
}

export interface DashboardSummary {
  totalProducts: number;
  lowStockCount: number;
  stockValue: number;
  salesOrders: number;
  salesRevenue: number;
  topProducts: { id: number; name: string; unitsSold: number; revenue: string }[];
  salesTrend: { day: string; revenue: string }[];
}

export type MovementReason = 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGE';

export interface StockMovement {
  id: number;
  productId: number;
  changeQty: number;
  reason: MovementReason;
  notes?: string | null;
  createdAt: string;
  product?: { id: number; name: string; sku: string };
  createdBy?: { id: number; name: string; email: string; role: Role };
  order?: { id: number; orderNumber: string; type: string };
}

export interface AdjustStockPayload {
  type: 'INCREASE' | 'DECREASE';
  quantity: number;
  reason: 'ADJUSTMENT' | 'RETURN' | 'DAMAGE';
  notes?: string;
  idempotencyKey?: string;
}

export interface AdjustStockResponse {
  product: Product;
  movement: StockMovement | null;
  previousStock: number;
  newStock: number;
  duplicatePrevented?: boolean;
  message?: string;
}

