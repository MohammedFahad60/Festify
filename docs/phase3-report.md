# Phase 3 report — authentication and authorization

## Implemented

- Short-lived HS256 JWT access cookies (`festify_access`, 15 minutes) with `sub`, `role`, and `sid` claims.
- Cryptographically random 48-byte opaque refresh cookies (`festify_refresh`) with SHA-256 hashes in `Session` and 30-day rotation.
- Refresh rotation, session revocation, family-level reuse detection, and cookie clearing.
- Bcrypt password hashing at cost 12, strength validation, common-pattern rejection, and safe DTOs.
- Email verification and password reset tokens are random, single-use, hashed, and written to `EmailOutbox`.
- Registration, login, logout, refresh, me, verification, password reset/change, forgot-password, and organizer-upgrade handlers.
- `requireAuth`, `requireRole`, and `requireRoles` use signed JWT identity plus database session/user status.
- IP/email rate limits on sensitive authentication routes.
- Security audit entries for registration, login, password events, verification, and refresh reuse.
- Shared schemas in `packages/validation`.

## Endpoints

`POST /api/v1/auth/register`, `/login`, `/logout`, `/refresh`, `/forgot-password`, `/reset-password`, `/verify-email`, `/change-password`, `/organizer`; `GET /api/v1/auth/me`.

The `/api` compatibility mount remains available for existing legacy tests/clients.

## Verification

Passed: `npm install`, `npm run build` (API, validation package, and web), and static authentication primitive tests are included. Full Prisma-backed integration tests were not run because the repository still cannot download the Prisma engine from `https://binaries.prisma.sh`, and no verified PostgreSQL 16 database is available in this environment.

## Limitations

The current generated Prisma client is from the previously generated foundation until Prisma engine access is restored. New auth session/token tables therefore use parameterized raw Prisma queries against the approved schema. This is an implementation bridge, not an architecture change. Production SMTP delivery and distributed rate limiting remain deployment concerns.

## Next phase

Restore Prisma engine/PostgreSQL verification, run the complete auth integration suite, then implement the approved user/profile, event, registration, and ticket APIs.
