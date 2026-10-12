# StockFlow — Inventory & Order Management System

A production-style full-stack application for small retailers and warehouses to manage products, suppliers, stock, and sales/purchase orders — with role-based access, a KPI dashboard, low-stock alerts, and a full audit trail of every stock movement.

**Tech stack:** React + TypeScript + Tailwind (frontend) · Node.js + Express + TypeScript (backend) · PostgreSQL + Prisma (database) · JWT authentication with role-based authorization.

> Built as a real, defensible portfolio project — every feature is implemented, not mocked.

---

## Table of contents
- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database setup](#database-setup)
- [API documentation](#api-documentation)
- [Security](#security)
- [Testing](#testing)
- [Deployment](#deployment)
- [Future improvements](#future-improvements)

## Features
- **Authentication & authorization** — register/login, bcrypt password hashing, JWT access tokens + rotating refresh tokens (httpOnly cookie), three roles (Admin / Manager / Staff) with role-guarded routes.
- **Product management** — full CRUD with SKU uniqueness, categories, suppliers, search, filtering, sorting, and pagination.
- **Order management** — create SALE and PURCHASE orders that **atomically adjust stock inside a database transaction**; insufficient stock is rejected with `409`.
- **Status workflow** — orders move through `PENDING → CONFIRMED → FULFILLED / CANCELLED` with validated transitions; cancelling restores stock.
- **Inventory intelligence** — low-stock detection, automatic low-stock notifications, and an append-only stock-movement ledger for a complete audit trail.
- **Dashboard** — KPIs (stock value, low-stock count, sales revenue) and top-products, computed with raw SQL aggregates.
- **Production concerns** — centralized error handling, request validation, structured logging, rate limiting, secure headers, and CORS.

## Tech stack
| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router, Axios |
| Backend | Node.js, Express, TypeScript, Zod (validation), Pino (logging) |
| Database | PostgreSQL, Prisma ORM (+ raw SQL for reporting) |
| Auth | JWT (access + refresh), bcryptjs |
| Testing | Vitest, Supertest |
| Tooling | Docker Compose (local Postgres), ESLint-ready config |

## Architecture
```
React (TS) ──HTTPS/REST + JWT──▶ Express API ──Prisma──▶ PostgreSQL
  pages/components/hooks           routes→middleware→controllers
  AuthContext + ProtectedRoute       →services→data layer
```
Requests flow **route → middleware (auth, RBAC, validation) → controller → service (business logic + transactions) → Prisma → PostgreSQL**. Controllers never touch the database; services never touch `req`/`res`. See the design decisions in code comments.

## Project structure
```
stockflow/
├── docker-compose.yml         # local PostgreSQL
├── server/                    # Express + TypeScript API
│   ├── prisma/                # schema.prisma, migrations, seed
│   └── src/
│       ├── config/  middleware/  utils/
│       └── modules/           # auth, products, orders, dashboard, ...
└── client/                    # React + TypeScript + Tailwind
    └── src/                   # api, auth, components, features, pages
```

## Getting started

**Prerequisites:** Node.js 18+, and either Docker (for local Postgres) or a hosted PostgreSQL URL.

```bash
# 1. Start PostgreSQL (Docker)
docker compose up -d

# 2. Backend
cd server
cp .env.example .env            # then edit secrets
npm install
npm run prisma:migrate          # creates tables
npm run seed                    # demo users + products
npm run dev                     # → http://localhost:4000

# 3. Frontend (new terminal)
cd client
cp .env.example .env
npm install
npm run dev                     # → http://localhost:5173
```

**Demo logins** (from the seed): `admin@stockflow.dev`, `manager@stockflow.dev`, `staff@stockflow.dev` — all with password `Password123!`.

## Environment variables
**server/.env**
| Key | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Token signing secrets (use `openssl rand -hex 32`) |
| `ACCESS_TOKEN_TTL` / `REFRESH_TOKEN_TTL_DAYS` | Token lifetimes |
| `CLIENT_ORIGIN` | Allowed CORS origin(s) |
| `PORT` | API port (default 4000) |

**client/.env**: `VITE_API_URL` — base URL of the API (e.g. `http://localhost:4000/api/v1`).

## Database setup
Prisma manages the schema and migrations. After editing `prisma/schema.prisma`:
```bash
npm run prisma:migrate     # dev: create + apply a migration
npm run prisma:deploy      # prod: apply existing migrations
```
Key design choices: money stored as `DECIMAL` (not float); `CHECK` constraints keep stock/price non-negative; `stock_movements` is an append-only ledger so stock history is always auditable; indexes on `products(category_id)`, `products(quantity_in_stock)`, `orders(status)`, and `order_items(order_id)`.

## API documentation
Base URL: `/api/v1`. Protected routes require `Authorization: Bearer <accessToken>`.

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | Register (first user becomes ADMIN) |
| POST | `/auth/login` | Public | Login → access token + refresh cookie |
| POST | `/auth/refresh` | Cookie | Rotate access token |
| POST | `/auth/logout` | — | Clear refresh cookie |
| GET | `/auth/me` | Auth | Current user |
| GET/POST/PATCH/DELETE | `/products` | Auth / MANAGER+ | Product CRUD |
| GET | `/products?search=&categoryId=&sort=&order=&page=&limit=` | Auth | Search/filter/sort/paginate |
| GET | `/products/low-stock` | Auth | Items at/below reorder level |
| POST | `/orders` | Auth | Create order (atomic stock change) |
| GET | `/orders` | Auth | List with filters + pagination |
| GET | `/orders/:id` | Auth | Order detail + items |
| PATCH | `/orders/:id/status` | MANAGER+ | Advance/cancel (validated) |
| GET | `/dashboard/summary` | Auth | KPIs (raw SQL) |
| GET/POST | `/categories`, `/suppliers` | Auth / MANAGER+ | Reference data |
| GET/PATCH | `/users` | ADMIN | User & role management |
| GET | `/notifications` | Auth | Low-stock & system notifications |

**Example — create a sale**
```http
POST /api/v1/orders
Authorization: Bearer <token>
{ "type": "SALE", "customerName": "Acme", "items": [{ "productId": 1, "quantity": 3 }] }

201 → { "data": { "orderNumber": "SO-000001", "status": "CONFIRMED", "totalAmount": "2397.00", ... } }
409 → { "error": "INSUFFICIENT_STOCK", "message": "Not enough stock for \"...\"", "details": { "available": 1, "requested": 3 } }
```

## Security
- **Passwords** hashed with bcrypt (cost 12) — never stored or logged in plaintext.
- **JWT** short-lived access token (15m) + rotating refresh token in an **httpOnly, Secure, SameSite cookie** so JavaScript can't read it (mitigates XSS token theft).
- **RBAC middleware** enforces Admin/Manager/Staff permissions per route.
- **Input validation** with Zod on every request body/query.
- **SQL injection** prevented by Prisma parameterization (raw SQL uses tagged templates).
- **Helmet** for secure headers, **CORS** allow-list, **rate limiting** on `/auth`.
- **Secrets** only via environment variables — none hardcoded; config fails fast if missing.
- **Generic auth errors** ("Invalid email or password") to avoid user enumeration.

## Testing
```bash
cd server && npm test
```
Vitest + Supertest cover the HTTP layer (routing, validation, auth guards) and the Zod schemas without needing a database. For full integration tests against Postgres, point `DATABASE_URL` at a disposable test database and run the order/stock scenarios (create sale → stock decrements; insufficient stock → 409; cancel → stock restored).

## Deployment
Recommended free-tier setup:
- **Database:** [Neon](https://neon.tech) or [Supabase](https://supabase.com) (managed PostgreSQL) → copy the connection string into `DATABASE_URL`.
- **Backend:** [Render](https://render.com) web service — build `npm install && npm run build && npm run prisma:deploy`, start `npm start`. Set all `server/.env` variables in the dashboard.
- **Frontend:** [Vercel](https://vercel.com) — set `VITE_API_URL` to the deployed API URL; build `npm run build`, output `dist/`.
- Set the backend's `CLIENT_ORIGIN` to the deployed frontend URL so CORS + the refresh cookie work. Common gotchas: cookie `SameSite=None; Secure` is required cross-site in production, and Render free services cold-start after inactivity.

## Future improvements
- Product image upload (S3-compatible storage) and CSV import/export.
- Real-time low-stock notifications via WebSockets.
- Full integration test suite in CI (GitHub Actions) against an ephemeral Postgres.
- Barcode scanning for stock intake; multi-warehouse support.

---

*Built by Vishali A — Full Stack Developer (React · Node · TypeScript · PostgreSQL).*
