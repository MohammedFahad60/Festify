# FESTIFY — Phase 1 Audit (2026-09-05 UTC)

## Executive Summary
Audited the `arena/01a070a8-festify` branch (base `48a361b Initial commoit`).  
Backend is a substantial Express + Prisma + PostgreSQL implementation with 9 test suites (88 tests) that previously passed on Windows (see `full-test-output.txt`). Frontend is **absent** — `apps/web` is an unresolved git submodule (commit `a71b40d070885b444d0f8e02417e539255f2e012`, no URL in `.gitmodules`), so no Next.js code is present locally. Prisma schema and migrations are **not committed** — `prisma/` does not exist, so `prisma validate` / `migrate status` / `generate` all fail. `.env` and `.env.example` are missing/empty. These three gaps make the project **not buildable or deployable** in the current checkout despite the code itself being mostly sound.

---

## 1) Repository & Configuration

- **Git state**: single commit `48a361b`, working tree clean, branch `arena/01a070a8-festify`. No uncommitted changes. `apps/web` is a submodule (`160000 commit a71b40d...`) with no remote URL — `git submodule update` fails with “No url found”.
- **Workspaces**: root `package.json` declares `workspaces: ["apps/*","packages/*"]` but `apps/web/package.json` does not exist, `apps/api/package.json` exists. `npm run dev:web` / `build` will fail.
- **Prisma**: `prisma.config.ts` expects `prisma/schema.prisma` and `prisma/migrations` + `prisma/seed.ts`, none of which exist. `package.json` lists `prisma@7.9.1` and `@prisma/adapter-pg` / `@prisma/client` at root.
- **Generated client**: `apps/api/src/lib/prisma.ts` and all services import from `../generated/prisma/client.js` (§ `src/generated` is gitignored via `apps/api/src/generated/`). Without `prisma generate`, `npx tsc --noEmit` fails on `Cannot find module '../../generated/prisma/client.js'`.
- **Environment**: `apps/api/src/config/env.ts` loads `../../../../.env` and requires `DATABASE_URL` + `JWT_SECRET`. No `.env` file exists; `.env.example` is 0 bytes. `full-test-output.txt` shows tests previously used `D:/.../festify-v2/.env` injecting 5 vars.
- **Server**: `apps/api/src/server.ts` binds to `127.0.0.1:${API_PORT}` — platform preview requires `0.0.0.0`.

## 2) Phase 2 — Verification Commands (actual runs)

```bash
cd apps/api && npx tsc --noEmit
# → 22 errors:
# - Cannot find module '../../generated/prisma/client.js' (lib/prisma.ts, order.services.ts, payment.services.ts, festival.services.ts, ticket.services.ts, helpers/db.ts)
# - Implicit any on params: helpers/auth.ts(116,117), helpers/db.ts(41,49,57,65,73), middleware/auth.ts(61,101), admin.services.ts(27), auth.controller.ts(206), auth.services.ts(139), order.services.ts(43,165,252,276), organizer.service.ts(65), payment.services.ts(59,182,246), ticket.services.ts(165,179)

npx prisma validate
# → Failed to load config: Cannot resolve env var DATABASE_URL (prisma.config.ts)
# with dummy env: DATABASE_URL=postgresql://... JWT_SECRET=test npx prisma validate
# → Error: schema file not found + later engine download network error (engines already cached but schema missing)

npx prisma migrate status
# → Same DATABASE_URL error; no prisma/migrations folder exists.

cd apps/web && npx tsc --noEmit / npx next build
# → No files: apps/web is empty directory (2 entries, no package.json), build fails.

npm test (apps/api)
# → Not runnable without DB + generated client + env. Historical run (full-test-output.txt, 159.78s, 88/88 passed) used local Postgres.
```

## 3) Backend Routes / Controllers / Services

**Auth (`/api/auth`)**:
- POST `/register` Zod validates name/email/phone/password, creates user with `ATTENDEE` role, hashes with bcrypt(12), JWT in httpOnly lax cookie. No mass assignment (role fixed). Good.
- POST `/login` validates, checks `status === "ACTIVE"`, bcrypt compare, JWT. Good.
- GET `/me` requires `requireAuth`. Returns `select` without `passwordHash`. Good.
- No rate limiting, no email verification, no password reset. `JWT_SECRET` required, expiry `7d`.

**Festival (`/api/festivals`)**:
- POST `/` `requireAuth+ORGANIZER`, Zod `createFestivalSchema` (name, description?, categoryId uuid, venueId uuid, banner url?, startDate datetime, endDate datetime, startTime?, endTime?, capacity?, cancellationPolicy unknown?). Service `createFestival` derives `organizerId` from user, checks `verificationStatus === APPROVED`, checks category/venue exist, slug dedupe loop, `status: "DRAFT"` fixed. ✅ No client-controlled status/ownership.
- PATCH `/:id` `ORGANIZER`, partial schema, service `updateFestival` checks ownership, only `DRAFT`/`REJECTED` editable, validates `startDate < endDate` (only on update, **not on create** — bug), validates category/venue. Good.
- PATCH `/:id/submit` only from `DRAFT` → `SUBMITTED`. Good.
- PATCH `/:id/publish` only from `APPROVED` → `PUBLISHED`. Good.
- GET `/` public, `getPublishedFestivals` selects only `PUBLISHED`, excludes passwordHash via `publicOrganizer` select. Good.
- GET `/:id` public, only `PUBLISHED`. Good.
- GET `/organizer` and `/organizer/:id` require `ORGANIZER`, enforce ownership. Good. Route order correctly places `/organizer` before `/:id`.
- **Images**: POST `/:id/images` etc require `ORGANIZER`, only `DRAFT`/`REJECTED` editable, validates `imageUrl` url, ownership via `festival.organizerId`. GET `/:id/images` uses `optionalAuth` — allows public read for `PUBLISHED`, otherwise requires owner. Good.
- **Missing**: UUID validation on `/:id` param in `getPublishedFestivalController`, `listFestivalImagesController` only validates via `idSchema` partially; `festival.routes` does not validate `festivalId` for ticket-type creation.

**Ticket Type (`/festivals/:festivalId/ticket-types`)**:
- POST requires `ORGANIZER`, Zod validates name, price nonnegative, quantity positive, saleStart/End datetime, maxPerUser positive?. Service checks organizer approved, festival exists + owned, saleEnd > saleStart. **Does not check festival status** (allows creating types on published festivals). Good otherwise.

**Order (`/api/orders`)**:
- POST `/` requires auth, Zod validates festivalId uuid + items min 1. Service transaction `SERIALIZABLE`: checks festival exists + `PUBLISHED` + `endDate > now` (allows ordering after start, before end), merges duplicate ticketTypeIds, for each: checks ticketType exists, belongs to festival, `status === ACTIVE`, sale window `now in [saleStart,saleEnd]`, aggregates prior PENDING/CONFIRMED quantity for `maxPerUser`, then `updateMany` with `soldQuantity <= quantity-quantity` atomic increment. Calculates `totalAmount` server-side via `Prisma.Decimal`. Creates order `PENDING`. ✅ No overselling, server-side pricing, inventory reserved atomically.
- POST `/:id/confirm` requires auth, `SERIALIZABLE`: checks order exists, owned, if already `CONFIRMED` idempotent return, else must be `PENDING` + have SUCCESS payment, then update to `CONFIRMED`. Good.
- GET `/` and GET `/:id` enforce ownership.
- PATCH `/:id/cancel` transaction checks `PENDING` or `CONFIRMED`, rejects if any `SUCCESS` payment, rejects if `festival.startDate <= now`, restores `soldQuantity` via `decrement`, cancels `CREATED/PENDING` payments, sets `CANCELLED`. Good, but edge: CONFIRMED without refund is intentionally blocked.
- **Issue**: `maxPerUser` check uses aggregate before `updateMany`; two concurrent tx could both pass check then both increment, exceeding limit — Serializable helps but P2034 is currently mapped to 500 not 409.
- **Issue**: No order expiry / stale PENDING cleanup.

**Payment (`/api/payments` + `/api/orders/:id/payment`)**:
- POST `/orders/:id/payment` creates payment `CREATED` idempotently (returns existing if `CREATED/PENDING` exists), validates order owned + `PENDING` + has items, amount = `order.totalAmount` server-side. Good idempotency.
- POST `/payments/:id/test-success` and `/test-fail` are dev-only, require auth, validate payment owned, check `CREATED/PENDING` and order `PENDING`, then `SUCCESS` + `order CONFIRMED` + `issueTickets`. Good.
- `issueTickets` computes missing = quantity - alreadyIssued, `createMany` with unique `FST-` codes, idempotent via `existingTickets` map. Good — duplicate success does not duplicate tickets.
- GET `/orders/:id/payment` checks ownership, returns latest payment.
- **Issue**: Payment routes use `test-success` name which may confuse prod; no real provider.

**Ticket (`/api/tickets`)**:
- GET `/` and GET `/:id` require auth, ownership enforced.
- POST `/validate` requires `ORGANIZER`, validates `ticketCode` non-empty, transaction checks organizer owns festival via `festival.organizerId`, `getTicketValidity` checks `status === ACTIVE`, `order === CONFIRMED`, payments `SUCCESS`. Returns `{valid, reason, ticket}`.
- POST `/:ticketCode/check-in` requires `ORGANIZER`, same checks, then `updateMany where status ACTIVE` → `USED`, Serializable. If count !==1 throw `TICKET_ALREADY_USED`. Handles concurrent check-ins (P2034 observed in logs, test expects at most 1 success). Good.
- **Missing**: No `STAFF` role support (task lists STAFF but no routes check STAFF).

**Organizer (`/api/organizers`)**:
- POST `/` any auth can create organizer profile (`PENDING`), Zod validates org name, duplicate check `ORGANIZER_ALREADY_EXISTS`.
- GET `/me` returns organizer for current user.
- PATCH `/:id/approve` requires `ADMIN`, transactional approve + `userRole.upsert` for ORGANIZER role. Duplicate with admin route. Good.

**Admin (`/api/admin`)**:
- All require `ADMIN`. Pending organizers where `PENDING`, festivals where `SUBMITTED`. Approve/reject only from those states. `approveOrganizer` transactional upsert ORGANIZER role. Good.
- No pagination, no audit log.

**Catalog (`/api/catalog`)**:
- GET `/categories` ACTIVE only, GET `/venues` all. Public, no auth. Good.

**Test routes (`/api/test`)**:
- `/attendee`, `/organizer`, `/admin` each require respective role — used for auth tests.

## 4) Security Review (Phase 3)

✅ **Good**: 
- Authentication via httpOnly `festify_token` cookie, `secure` in prod, `sameSite:lax`, `helmet`, `cors` with credentials.
- Role authorization enforced on every private route via `requireRole`.
- Ownership checks: festival update/submit/publish/image, order read/confirm/cancel, payment create/success/fail/read, ticket read/validate/check-in, organizer approve all verify `userId` or `organizerId`.
- UUID validation via Zod on most body fields and some params (`order/:id`, `festival/:id` for update/image).
- Server-side pricing/inventory, no `passwordHash` exposure (all selects exclude it), safe error messages (500 → “Something went wrong”), no stack leak.
- No mass assignment (Zod strict), no client-controlled status/ownership.

⚠️ **Issues**:
- **Missing UUID validation** on `GET /festivals/:id`, `GET /festivals/:id/images`, `POST /festivals/:festivalId/ticket-types` (festivalId param passed as `String(...)` without Zod). Prisma will throw P2023 on malformed UUID — currently maps to 500, not 400. Should validate.
- **Missing date validation on create** — `createFestival` does not ensure `startDate < endDate`; `updateFestival` does.
- **Ticket type creation allows any festival status** — should likely restrict to `DRAFT`/`REJECTED` before approval.
- **No rate limiting / brute force protection** on login/register.
- **P2034 serialization failures** (seen in `full-test-output.txt` for concurrent orders and check-ins) bubble as 500 instead of 409/retry.
- **STAFF role defined in task but never used** — no middleware or routes check it (expected to be able to check-in? Currently only ORGANIZER).
- `optionalAuth` silently swallows JWT errors and continues — okay for public routes, but could hide issues.

## 5) Order / Payment / Ticket Integrity (Phase 4)

Traced `Festival → TicketType → Order → Payment → Confirmation → Ticket → Check-in`:

- Only `PUBLISHED` festivals purchasable ✅
- Ticket sale window enforced ✅
- Quantity positive int via Zod ✅
- `maxPerUser` enforced via prior aggregate ✅ (with concurrency caveat above)
- Server totals via `Prisma.Decimal` ✅
- Atomic inventory `updateMany` + `SERIALIZABLE` ✅ — concurrency test shows P2034 but still prevents oversell (test `concurrent orders cannot oversell inventory` passed)
- Payment idempotency via existing `CREATED/PENDING` check ✅
- Payment success idempotency via `if status SUCCESS` + `issueTickets` missing calculation ✅
- Payment failure cannot confirm (confirm checks `payments.length ===0`) ✅
- Confirmed cannot regress (only `PENDING→CONFIRMED`) ✅
- One ticket per quantity via `issueTickets` + `createMany` ✅
- Duplicate success cannot duplicate (missing calc) ✅
- ACTIVE → USED via `updateMany` ✅
- Repeated check-in → 409 ✅ (concurrent test expects ≤1 success, verified)

**Gaps**:
- Order `totalAmount` not revalidated against current ticket prices at payment success (price could change after order — but order stores `unitPrice`/`totalPrice`, payment uses `order.totalAmount`, so ok).
- No order expiration — `PENDING` could hold inventory forever.
- `cancelOrder` blocks cancel if any SUCCESS payment, but no refund flow.

## 6) Festival Lifecycle (Phase 5)

`DRAFT → SUBMITTED → APPROVED → PUBLISHED` and `REJECTED → edit → resubmit` is enforced:
- `submit` only from `DRAFT`, `approve/reject` only from `SUBMITTED`, `publish` only from `APPROVED`, `update`/`image` only `DRAFT`/`REJECTED`.
- Organizer cannot bypass approval (publish requires `APPROVED`, tested `published festival cannot be edited`).
- Published festivals cannot be modified via organizer endpoints (returns 409).
- Missing states `UNDER_REVIEW`, `ONGOING`, `COMPLETED` mentioned in task but not implemented — currently `SUBMITTED` is used directly without `UNDER_REVIEW`. No transition to `ONGOING`/`COMPLETED` based on dates.
- Admin can only approve `SUBMITTED`, good.

## 7) Frontend (Phase 6) — **ABSENT**

`apps/web` is empty. Task lists required routes:
`/, /festivals/[id], /login, /orders, /orders/[id], /tickets/[id], /organizer, /organizer/festivals, /organizer/festivals/new, /organizer/festivals/[id], /organizer/festivals/[id]/edit, /organizer/festivals/[id]/tickets, /organizer/festivals/[id]/check-in, /admin, /admin/organizers, /admin/festivals`

None can be audited. Premium UI requirements (transitions, staggered cards, hover/press, dialogs, skeletons, responsive, focus-visible, reduced-motion) cannot be verified. Next.js 16 / React 19 / Tailwind expected but no code.

## 8) Premium UI & Accessibility (Phases 7-8)

No frontend code → cannot audit typography, spacing, cards, buttons, forms, badges, dialogs, navigation, tables, loading/empty/error states, animations, reduced-motion, keyboard nav, contrast. Backend accessibility: JSON error messages are descriptive, but no i18n.

## 9) Testing (Phase 9)

- 9 suites, 88 tests, all passed historically (159.78s). Coverage: auth, authorization, festival workflow, ticket types, orders/inventory, payments, ticket issuance, check-in, security.
- Helpers use `test-` prefix + `cleanupTestData` respecting FK order (tickets→payments→orderItems→orders→ticketTypes→images→festivals→userRoles→organizers→users). No `migrate reset`, preserves fixtures.
- `TEST_DATABASE_URL` support documented, helpers prefer it. Need migrations applied before run.
- Missing tests for: under-review/ongoing/completed states, organizer image permissions edge (REJECTED→edit→resubmit cycle with images), inventory race with maxPerUser, payment failure → confirm blocked, STAFF role, UUID validation failures, festival date invalid on create.
- No frontend tests.

## 10) Configuration (Phase 10)

- `DATABASE_URL`, `JWT_SECRET` required via `env.ts` — correct, but no `.env.example` documentation.
- `JWT_EXPIRES_IN`, `API_PORT`, `CORS_ORIGIN` optional with defaults.
- No `TEST_DATABASE_URL` example, no payment config, no prod behavior docs.
- `prisma.config.ts` correct for Prisma 7 but needs schema file.
- Root `package.json` workspace scripts `dev`, `dev:web`, `dev:api`, `build`, `lint` — `build` fails because web missing.
- No ESLint config visible for web, no Prettier, no CI.

## 11) Prioritized Fix List

### CRITICAL (blocks build / deploy / data integrity)
1. **C-1**: Add `prisma/schema.prisma` (and `prisma/migrations` + seed) — build failure, `prisma generate` missing, `tsc` fails.
2. **C-2**: Restore frontend `apps/web` (resolve submodule, provide Next.js app) — build failure, all frontend pages missing.
3. **C-3**: Fix `apps/api/src/generated` generation + implicit `any` tsc errors (22 errors) — `npx tsc --noEmit` fails.
4. **C-4**: Provide `.env` and proper `.env.example` (DATABASE_URL, JWT_SECRET, etc.) — server cannot start.
5. **C-5**: Change `server.ts` bind to `0.0.0.0` for preview.
6. **C-6**: Handle Prisma P2034 (serializable write conflicts) gracefully (map to 409, tests expect ≤1 success).

### HIGH (broken workflows / security / validation)
7. **H-1**: Add UUID Zod validation to all `req.params.id` / `festivalId` / `imageId` endpoints.
8. **H-2**: Add `startDate < endDate` validation to `createFestival`.
9. **H-3**: Restrict ticket-type creation to `DRAFT`/`REJECTED` (or at least not `PUBLISHED`) or document.
10. **H-4**: Add rate limiting to auth routes (express-rate-limit) without adding heavy deps — or document as known limitation.
11. **H-5**: Populate `.env.example` and README with setup steps, `TEST_DATABASE_URL` guidance.
12. **H-6**: Implement `UNDER_REVIEW` / `ONGOING` / `COMPLETED` transitions or document as out-of-scope for MVP.
13. **H-7**: Support `STAFF` role for check-in (or remove from spec).
14. **H-8**: Add order expiry / inventory release for stale `PENDING` orders.

### MEDIUM (polish / docs / config)
15. **M-1**: Fix implicit `any` by adding explicit types, enable `noImplicitAny` clean.
16. **M-2**: Deduplicate organizer approve route (keep only `/api/admin/...`).
17. **M-3**: Add pagination to list endpoints (`/festivals`, `/orders`, `/tickets`).
18. **M-4**: Add `prisma/migrations` initial migration (so `migrate status`/`deploy` work).
19. **M-5**: Add error mapping for P2034 → 409 with retry hint.
20. **M-6**: Frontend premium UI pass (once restored): skeleton loading, staggered cards, reduced-motion, focus-visible, responsive, empty/error/retry states.

---

## Remaining Verified Good

- Authentication/authorization, ownership, server-side pricing/inventory, idempotency, ticket issuance, check-in atomicity, festival lifecycle guards, passwordHash exclusion, safe errors — all solid.
- Test isolation strategy good, no production data reset.
- Code style consistent, Zod used everywhere except a few params, Prisma transactions correctly use `Serializable`.

Next: Begin Phase 2 fixes in small milestones (schema → tsc → env → server bind → validation → frontend scaffold).
