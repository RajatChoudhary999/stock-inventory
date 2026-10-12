import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { createOrderSchema } from '../modules/orders/orders.schema';
import { registerSchema } from '../modules/auth/auth.schema';

const app = createApp();

/**
 * These tests exercise the HTTP layer (routing, validation, auth guards) and the
 * Zod schemas — none require a live database, so they run in CI out of the box.
 * Full integration tests that hit Postgres are documented in the README.
 */
describe('health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('auth guards & validation', () => {
  it('rejects login with an invalid body (400)', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('BAD_REQUEST');
  });

  it('blocks protected route without a token (401)', async () => {
    const res = await request(app).get('/api/v1/products');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHORIZED');
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
  });
});

describe('schemas', () => {
  it('registerSchema requires an 8+ char password', () => {
    expect(registerSchema.safeParse({ name: 'Al', email: 'a@b.com', password: 'short' }).success).toBe(false);
    expect(registerSchema.safeParse({ name: 'Alice', email: 'a@b.com', password: 'longenough1' }).success).toBe(true);
  });

  it('createOrderSchema rejects an empty item list', () => {
    expect(createOrderSchema.safeParse({ type: 'SALE', items: [] }).success).toBe(false);
    expect(
      createOrderSchema.safeParse({ type: 'SALE', items: [{ productId: 1, quantity: 2 }] }).success,
    ).toBe(true);
  });
});
