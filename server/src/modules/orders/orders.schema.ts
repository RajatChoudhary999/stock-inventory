import { z } from 'zod';

export const createOrderSchema = z.object({
  type: z.enum(['SALE', 'PURCHASE']),
  supplierId: z.number().int().positive().optional(),
  customerName: z.string().max(120).optional(),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1, 'An order must contain at least one item'),
});

export const listOrdersQuery = z.object({
  type: z.enum(['SALE', 'PURCHASE']).optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'FULFILLED', 'CANCELLED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const updateStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'FULFILLED', 'CANCELLED']),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuery>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
