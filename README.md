# Festify — Festival Discovery & Ticketing

Full-stack MVP for festival discovery, ordering, and check-in. **Do not rebuild** — this repo is harden-and-ship.

- **Backend** `apps/api` — Express 5 + TypeScript 5.9 + Prisma 7 (PostgreSQL via `@prisma/adapter-pg` + driverAdapters) + Zod + JWT (httpOnly cookie) + bcrypt
- **Frontend** `apps/web` — Next.js 16.3.1 (Turbopack) + React 19 + Tailwind 4 + `credentials: include` rewrites
- **Roles** `ATTENDEE` / `ORGANIZER` / `ADMIN` / `STAFF`

## Architecture

```
festify-v2/
  prisma/
    schema.prisma          # PostgreSQL, enums + models, indexes
    seed.ts                # roles, categories, venues (idempotent upsert)
    migrations/            # `prisma migrate dev` output (see README)
  apps/api/
    src/
      config/env.ts       # loads ../../.env, requires DATABASE_URL + JWT_SECRET
      lib/prisma.ts        # PrismaPg adapter
      middleware/auth.ts   # jwt.verify + ACTIVE check
      middleware/roles.ts  # requireRole
      middleware/rate-limit.ts # in-memory, single-instance
      middleware/dev-only.ts   # blocks mock payment in production
      modules/{auth,festival,ticket-type,order,payment,ticket,organizer,admin,catalog}
      routes/index.ts      # /api/health checks DB
      server.ts            # 0.0.0.0
  apps/web/
    app/                   # 16 routes (public + organizer + admin)
    lib/api.ts             # API_URL + friendlyError + fetch credentials
    components/ui.tsx      # Button/Card/Badge/Skeleton/Dialog/Alert + header
```

Festival lifecycle: `DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → PUBLISHED → ONGOING|COMPLETED`. Only `PUBLISHED` is purchasable. Order `PENDING → CONFIRMED (via SUCCESS payment) → CANCELLED`. Payment `CREATED/PENDING → SUCCESS|FAILED|CANCELLED`. Ticket `ACTIVE → USED|CANCELLED`.

## Requirements

- **Node** 20+ (see `package.json` workspaces `apps/*`)
- **PostgreSQL** 14+ — project uses `provider = "postgresql"`; SQLite is not supported. `DATABASE_URL` and `TEST_DATABASE_URL` both point to Postgres.
- Network for `prisma generate` / `migrate` (fetches engines from `binaries.prisma.sh`). Offline builds use committed stub `apps/api/src/generated/prisma/{client.js,client.d.ts}` for `tsc` only — real DB tests require generation.

## Environment

See `.env.example` (no real secrets):

```
DATABASE_URL="postgresql://user:password@localhost:5432/festify"
TEST_DATABASE_URL="postgresql://user:password@localhost:5432/festify_test"
JWT_SECRET="change-me-to-a-strong-random-secret-at-least-32-characters"
JWT_EXPIRES_IN="7d"
API_PORT=4000
CORS_ORIGIN="http://localhost:3000"
NODE_ENV="development"
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

- Backend reads `../../.env` via `dotenv` in `src/config/env.ts`. Both `DATABASE_URL` and `JWT_SECRET` are required; boot fails otherwise.
- Frontend reads `NEXT_PUBLIC_API_URL` (fallback `http://localhost:4000`) for `fetch` + `next.config.js` rewrites `/api/:path*`.
- Secrets are **not committed** — `.env` is gitignored, `.env.example` documents keys.

## Database Setup

Initial migration has not been committed yet — `prisma/migrations` contains `README.md` only. With a live Postgres:

```bash
# 1. configure .env (above)
cp .env.example .env   # then edit JWT_SECRET + DATABASE_URL

# 2. generate client (requires network)
npx prisma generate

# 3. validate schema
npx prisma validate

# 4. create initial migration
npx prisma migrate dev --name init

# 5. seed roles/categories/venues
npx prisma db seed   # runs prisma/seed.ts via prisma.config.ts

# production / CI
npx prisma migrate deploy
npx prisma migrate status
```

Seed upserts `ATTENDEE, ORGANIZER, ADMIN, STAFF`, `music/arts/food/tech`, `Grand Hall` venue. Admin account is created via `POST /api/auth/register` then assigning `ADMIN` role directly in DB (no default admin email is seeded).

## Run

Backend:

```bash
npm install                 # root workspaces (also installs apps/api deps via adapter)
# or
npm install --workspace @festify/api
npm run dev --workspace @festify/api   # tsx watch src/server.ts → 0.0.0.0:4000
npm run build --workspace @festify/api # tsc
npm test --workspace @festify/api      # vitest run (needs TEST_DATABASE_URL + generated client)
```

Frontend:

```bash
npm install --workspace @festify/web
npm run dev --workspace @festify/web   # next dev -H 0.0.0.0 -p 3000
npm run build --workspace @festify/web # next build (16 routes)
npm run lint --workspace @festify/web  # eslint "app/**/*.tsx" (flat config)
```

Root shortcuts: `npm run dev`, `npm run dev:web`, `npm run dev:api`, `npm run build`, `npm run lint`.

Health: `GET /api/health` → `{ api: "ok", database: "ok|error" }` (does `SELECT 1`).

## Tests

Backend has 11 suites (auth, authorization, festival, festival-image, ticket-type, order, payment, ticket-issuance, ticket-checkin, security, phase3-additions). Important rules covered:

- server-side pricing, quantity validation, maxPerUser, inactive PUBLISHED, sale window, ended festival, ownership, overselling race, concurrent inventory (`Serializable` + `soldQuantity <= quantity - q`), payment idempotency, duplicate success no duplicate tickets, exact ticket quantity, ticket ownership, duplicate & concurrent check-in, cross-organizer 403.

```bash
cd apps/api
npm test                # uses TEST_DATABASE_URL fallback DATABASE_URL
npm run test:coverage
```

DB tests are isolated: `src/__tests__/helpers/db.ts` `cleanupTestData` deletes only `test-` prefixed users/festivals/orders. Never `migrate reset`.

## Production Build

```bash
# backend
cd apps/api && npx tsc --noEmit && npm test && npx prisma validate && npx prisma migrate status

# frontend
cd apps/web && npx tsc --noEmit && npm run lint && npx next build
```

Previous verified: `api tsc 0`, `web tsc 0`, `eslint 0`, `next build 16 routes`.

## API / Security Notes

- **Auth cookie** `festify_token` — `httpOnly:true`, `secure: NODE_ENV===production`, `sameSite:lax`, `maxAge 7d`, `path /`. 401 on missing/invalid/INACTIVE. Roles via `requireRole`.
- **CORS** `cors({ origin: env.corsOrigin, credentials:true })` — `CORS_ORIGIN` env, no wildcard. `helmet` enabled.
- **Validation** Zod for all inputs, UUID `z.string().uuid()`, `quantity int positive`, no trust of client `price/total/soldQuantity/status/userId`.
- **Inventory** atomic `updateMany where soldQuantity <= quantity - q` + `Serializable` + `P2034→409`.
- **Payment** server amount `order.totalAmount`, duplicate init returns existing, `SUCCESS` via `updateMany where status in [CREATED,PENDING]` (atomic) + `order PENDING→CONFIRMED` + `issueTickets` idempotent. `FAILED` never confirms.
- **Tickets** `ticketCode @unique`, `ACTIVE→USED` via `updateMany where status ACTIVE`, organizer owns `festival.organizerId`.
- **Rate limiting** lightweight in-memory `middleware/rate-limit.ts` on `login`/`register` (10/min IP), `POST /orders` 20/min, `POST /orders/:id/payment` 20/min, `validate`/`check-in` 60/min. Single-instance only — document as limitation for scaled deployments.
- **Payment test endpoints** `POST /api/payments/:id/test-success|test-fail` are **dev-only**: `requireDevEnvironment` returns 404 in `NODE_ENV=production`. No real provider.
- **Errors** all controllers map known codes to 4xx with `friendlyError()` compatible message, hide Prisma/stack. `P2034` → 409 retry.
- **Data exposure** `select` excludes `passwordHash`; no payment secrets in ticket reads.

## Development Payment Limitation

`test-success`/`test-fail` mock `MOCK` provider; no external payment. In production they are disabled (404). Do not expose as real payments.

## Known Limitations

- PostgreSQL required; no SQLite fallback.
- `npx prisma generate|validate|migrate` need network to `binaries.prisma.sh` (offline stub allows `tsc` only).
- Rate limiter is in-memory, not distributed.
- `test-success` mock not a real PSP.
- `apps/web` was previously a `160000` gitlink submodule — now converted to regular directory; `git log` shows conversion commit.

## Git

- `.gitignore` keeps `node_modules`, `.next`, `dist`, `*.tsbuildinfo`, `.env`, `prisma/.db*` but tracks `prisma/` and `apps/web`.
- Build artifacts and `prisma/.db` not committed.
