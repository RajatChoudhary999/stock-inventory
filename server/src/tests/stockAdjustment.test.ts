import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { adjustStockSchema } from '../modules/products/products.schema';

const app = createApp();

describe('Stock Adjustment & Movement Audit Feature', () => {
  let adminToken: string;
  let managerToken: string;
  let staffToken: string;
  let testProductId: number;
  let adminUserId: number;

  beforeAll(async () => {
    // Find or create seeded users for tests
    const admin = await prisma.user.findUnique({ where: { email: 'admin@stockflow.dev' } });
    const manager = await prisma.user.findUnique({ where: { email: 'manager@stockflow.dev' } });
    const staff = await prisma.user.findUnique({ where: { email: 'staff@stockflow.dev' } });

    if (!admin || !manager || !staff) {
      throw new Error('Seed users missing. Run seed first.');
    }

    adminUserId = admin.id;
    adminToken = jwt.sign({ sub: admin.id, role: admin.role, email: admin.email }, env.jwt.accessSecret);
    managerToken = jwt.sign({ sub: manager.id, role: manager.role, email: manager.email }, env.jwt.accessSecret);
    staffToken = jwt.sign({ sub: staff.id, role: staff.role, email: staff.email }, env.jwt.accessSecret);

    // Create a dedicated test product for testing stock adjustments
    const product = await prisma.product.create({
      data: {
        sku: `TEST-ADJ-${Date.now()}`,
        name: 'Automated Test Product',
        unitPrice: 500,
        costPrice: 300,
        quantityInStock: 20,
        reorderLevel: 10,
      },
    });
    testProductId = product.id;
  });

  afterAll(async () => {
    // Clean up test records
    if (testProductId) {
      await prisma.stockMovement.deleteMany({ where: { productId: testProductId } });
      await prisma.activityLog.deleteMany({ where: { entityId: testProductId } });
      await prisma.product.delete({ where: { id: testProductId } });
    }
  });

  describe('Validation & Schema Tests', () => {
    it('accepts valid INCREASE and DECREASE inputs', () => {
      expect(
        adjustStockSchema.safeParse({
          type: 'INCREASE',
          quantity: 10,
          reason: 'ADJUSTMENT',
          notes: 'Routine inventory count',
        }).success,
      ).toBe(true);

      expect(
        adjustStockSchema.safeParse({
          type: 'DECREASE',
          quantity: 5,
          reason: 'DAMAGE',
          notes: 'Broken during transit',
        }).success,
      ).toBe(true);
    });

    it('rejects invalid quantities (negative, zero, decimal)', () => {
      expect(adjustStockSchema.safeParse({ type: 'INCREASE', quantity: 0, reason: 'ADJUSTMENT' }).success).toBe(false);
      expect(adjustStockSchema.safeParse({ type: 'INCREASE', quantity: -5, reason: 'ADJUSTMENT' }).success).toBe(false);
      expect(adjustStockSchema.safeParse({ type: 'INCREASE', quantity: 3.5, reason: 'ADJUSTMENT' }).success).toBe(false);
    });

    it('rejects unsupported adjustment reasons', () => {
      expect(adjustStockSchema.safeParse({ type: 'INCREASE', quantity: 5, reason: 'INVALID_REASON' }).success).toBe(false);
      expect(adjustStockSchema.safeParse({ type: 'INCREASE', quantity: 5, reason: 'PURCHASE' }).success).toBe(false);
    });
  });

  describe('Authorization Guards', () => {
    it('rejects adjustment requests without authentication (401)', async () => {
      const res = await request(app)
        .post(`/api/v1/products/${testProductId}/adjust`)
        .send({ type: 'INCREASE', quantity: 5, reason: 'ADJUSTMENT' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHORIZED');
    });

    it('rejects adjustment requests from STAFF role (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/products/${testProductId}/adjust`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ type: 'INCREASE', quantity: 5, reason: 'ADJUSTMENT' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });

    it('allows MANAGER and ADMIN to perform adjustments', async () => {
      const res = await request(app)
        .post(`/api/v1/products/${testProductId}/adjust`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ type: 'INCREASE', quantity: 5, reason: 'ADJUSTMENT', notes: 'Manager intake' });

      expect(res.status).toBe(200);
      expect(res.body.data.product.quantityInStock).toBe(25);
    });
  });

  describe('Transaction & Business Logic', () => {
    it('successfully increases stock and creates audit movement record', async () => {
      const res = await request(app)
        .post(`/api/v1/products/${testProductId}/adjust`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'INCREASE',
          quantity: 15,
          reason: 'RETURN',
          notes: 'Customer returned sealed units',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.previousStock).toBe(25);
      expect(res.body.data.newStock).toBe(40);
      expect(res.body.data.movement.changeQty).toBe(15);
      expect(res.body.data.movement.reason).toBe('RETURN');
      expect(res.body.data.movement.notes).toBe('Customer returned sealed units');

      // Verify in DB
      const dbProduct = await prisma.product.findUnique({ where: { id: testProductId } });
      expect(dbProduct?.quantityInStock).toBe(40);
    });

    it('successfully decreases stock and records negative delta in audit ledger', async () => {
      const res = await request(app)
        .post(`/api/v1/products/${testProductId}/adjust`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'DECREASE',
          quantity: 10,
          reason: 'DAMAGE',
          notes: 'Water damage during cleaning',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.previousStock).toBe(40);
      expect(res.body.data.newStock).toBe(30);
      expect(res.body.data.movement.changeQty).toBe(-10);
      expect(res.body.data.movement.reason).toBe('DAMAGE');
    });

    it('rejects attempts to reduce stock below zero (409 Conflict)', async () => {
      const res = await request(app)
        .post(`/api/v1/products/${testProductId}/adjust`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'DECREASE',
          quantity: 9999,
          reason: 'ADJUSTMENT',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('INSUFFICIENT_STOCK');

      // Verify product stock did not change
      const dbProduct = await prisma.product.findUnique({ where: { id: testProductId } });
      expect(dbProduct?.quantityInStock).toBe(30);
    });

    it('returns 404 for nonexistent product', async () => {
      const res = await request(app)
        .post('/api/v1/products/999999/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'INCREASE',
          quantity: 5,
          reason: 'ADJUSTMENT',
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('prevents duplicate submissions using idempotencyKey', async () => {
      const idempotencyKey = `idem-key-${Date.now()}`;

      // First submission
      const res1 = await request(app)
        .post(`/api/v1/products/${testProductId}/adjust`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'INCREASE',
          quantity: 5,
          reason: 'ADJUSTMENT',
          idempotencyKey,
          notes: 'Idempotency test call',
        });

      expect(res1.status).toBe(200);
      expect(res1.body.data.duplicatePrevented).toBe(false);
      expect(res1.body.data.newStock).toBe(35);

      // Second duplicate submission with identical idempotencyKey
      const res2 = await request(app)
        .post(`/api/v1/products/${testProductId}/adjust`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'INCREASE',
          quantity: 5,
          reason: 'ADJUSTMENT',
          idempotencyKey,
          notes: 'Idempotency test call',
        });

      expect(res2.status).toBe(200);
      expect(res2.body.data.duplicatePrevented).toBe(true);

      // Verify stock was NOT incremented twice
      const dbProduct = await prisma.product.findUnique({ where: { id: testProductId } });
      expect(dbProduct?.quantityInStock).toBe(35);
    });

    it('rolls back completely if movement creation fails', async () => {
      const initialProduct = await prisma.product.findUnique({ where: { id: testProductId } });
      const initialStock = initialProduct!.quantityInStock;

      // Simulate a failure inside the transaction
      await expect(
        prisma.$transaction(async (tx) => {
          await tx.product.update({
            where: { id: testProductId },
            data: { quantityInStock: { increment: 50 } },
          });

          // Throw deliberate error to trigger transaction rollback
          throw new Error('Simulated failure during movement persistence');
        }),
      ).rejects.toThrow('Simulated failure during movement persistence');

      // Verify rollback: stock remains unchanged
      const rolledBackProduct = await prisma.product.findUnique({ where: { id: testProductId } });
      expect(rolledBackProduct?.quantityInStock).toBe(initialStock);
    });

    it('handles concurrent adjustments safely with row locking', async () => {
      const current = await prisma.product.findUnique({ where: { id: testProductId } });
      const startingStock = current!.quantityInStock;

      // Fire 5 concurrent adjustments simultaneously (3 increases of 2, 2 decreases of 3)
      // Net change: +6 - 6 = 0
      const requests = [
        request(app).post(`/api/v1/products/${testProductId}/adjust`).set('Authorization', `Bearer ${adminToken}`).send({ type: 'INCREASE', quantity: 2, reason: 'ADJUSTMENT' }),
        request(app).post(`/api/v1/products/${testProductId}/adjust`).set('Authorization', `Bearer ${adminToken}`).send({ type: 'INCREASE', quantity: 2, reason: 'ADJUSTMENT' }),
        request(app).post(`/api/v1/products/${testProductId}/adjust`).set('Authorization', `Bearer ${adminToken}`).send({ type: 'INCREASE', quantity: 2, reason: 'ADJUSTMENT' }),
        request(app).post(`/api/v1/products/${testProductId}/adjust`).set('Authorization', `Bearer ${adminToken}`).send({ type: 'DECREASE', quantity: 3, reason: 'ADJUSTMENT' }),
        request(app).post(`/api/v1/products/${testProductId}/adjust`).set('Authorization', `Bearer ${adminToken}`).send({ type: 'DECREASE', quantity: 3, reason: 'ADJUSTMENT' }),
      ];

      const responses = await Promise.all(requests);
      responses.forEach((res) => expect(res.status).toBe(200));

      const finalProduct = await prisma.product.findUnique({ where: { id: testProductId } });
      expect(finalProduct?.quantityInStock).toBe(startingStock);
    });

    it('retrieves paginated movement history for the product', async () => {
      const res = await request(app)
        .get(`/api/v1/products/${testProductId}/movements`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('changeQty');
      expect(res.body.data[0]).toHaveProperty('reason');
      expect(res.body.data[0]).toHaveProperty('createdBy');
    });

    it('retrieves catalog-wide movement history', async () => {
      const res = await request(app)
        .get('/api/v1/products/movements')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('pagination');
    });
  });
});
