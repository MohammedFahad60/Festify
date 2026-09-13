# Local PostgreSQL development

This is the supported local verification path for Festify. The project uses Node 22, npm workspaces, PostgreSQL 16, Prisma 7, and `@prisma/adapter-pg`. Docker is the recommended way to run PostgreSQL. PGlite is only an offline smoke fallback and must not be used to claim PostgreSQL transaction or concurrency verification.

## Prerequisites

- Node.js 22.x (check with `node --version`)
- npm 10+
- Docker Desktop with Compose (Windows/macOS) or Docker Engine and Compose (Linux)
- Git

PowerShell, macOS/Linux shells, and Windows WSL are supported. The commands below use npm scripts rather than Bash-specific tooling.

## Install and configure

PowerShell:

```powershell
npm install
Copy-Item .env.example .env
```

macOS/Linux:

```bash
npm install
cp .env.example .env
```

Edit `.env` and use a development-only secret of at least 32 characters:

```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/festify"
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/festify_test"
JWT_SECRET="replace-with-a-local-secret-at-least-32-characters"
AUTH_DEV_TOKENS="true"
NODE_ENV="development"
API_PORT="4000"
CORS_ORIGIN="http://localhost:3000"
```

Never use these credentials in production. `AUTH_DEV_TOKENS=true` exposes verification/reset tokens only for local development and must not be enabled in production.

## Start PostgreSQL

```text
npm run db:start
```

This starts PostgreSQL 16 from `docker-compose.yml` on port 5432 with database `festify`, user `postgres`, and password `postgres`.

Check Docker Desktop if the command fails. To stop it:

```text
npm run db:stop
```

To use an existing local PostgreSQL installation instead, create databases `festify` and `festify_test`, then set both URLs in `.env`. Do not run `db:reset` against a shared database.

## Prisma setup

Run these commands from the repository root:

```text
npm run db:validate
npm run db:generate
npm run db:migrate
npm run db:seed
```

`db:migrate` runs `prisma migrate dev`; it creates/applies a development migration. For CI or a clean clone with committed migrations, use:

```text
npm run db:deploy
npm run db:seed
```

Reset only a disposable local database:

```text
npm run db:reset
```

Inspect the database:

```text
npm run db:studio
```

The Prisma client is generated at `apps/api/src/generated/prisma` and is consumed through `PrismaPg` in `apps/api/src/lib/prisma.ts`. Do not replace this with the default Prisma connection architecture.

## Seed accounts

The deterministic seed creates:

- `admin@festify.local` — ADMIN
- `organizer@festify.local` — ORGANIZER with approved legacy organizer data and sample events
- `user@festify.local` — USER

Development password for all three accounts:

```text
FestifyDevOnly!2026
```

The seed also creates categories, venue, draft/published events, free/paid ticket types, and role records. Run it again safely with `npm run db:seed`.

## Start and smoke-test the API

```text
npm run dev:api
```

The API listens on `http://localhost:4000`.

PowerShell smoke checks:

```powershell
Invoke-RestMethod http://localhost:4000/health
Invoke-RestMethod http://localhost:4000/api/v1/categories
Invoke-RestMethod http://localhost:4000/api/v1/events
Invoke-RestMethod http://localhost:4000/api/v1/openapi.json
```

The health response should report the API and database status. Authentication requests should be made with a cookie-preserving client such as the test suite or Postman; do not paste tokens into logs.

## Tests

Static checks:

```text
npm run typecheck
npm run lint
npm run build
```

All API tests:

```text
npm test --workspace=@festify/api
```

Or from the API workspace:

```text
npm test --workspace=@festify/api
```

Tests use `TEST_DATABASE_URL` when present. Before running database tests, apply the schema to that database:

```text
npm run db:deploy
npm run db:seed
```

The database-dependent suites require a real generated Prisma client and PostgreSQL. The concurrency tests must run against PostgreSQL; do not substitute PGlite and report them as equivalent.

## PGlite fallback

```text
npm run db:offline
```

This only checks the offline fallback runtime. It does not verify the PostgreSQL schema, foreign keys, migrations, isolation levels, locks, or concurrent registration/check-in behavior.

## Common errors

### `DATABASE_URL is not defined`

Copy `.env.example` to `.env`, edit `DATABASE_URL`, and run the command from the repository root. The API and Prisma config both read the root `.env`.

### Connection refused on port 5432

Run `npm run db:start`, wait for Docker health to become ready, or use a running local PostgreSQL 16 instance and correct `DATABASE_URL`.

### Prisma engine download/TLS failure

Prisma may need to download an engine from `https://binaries.prisma.sh`. Check network policy, proxy, TLS inspection, and firewall settings. Retry on a normal developer network, then run `npm run db:generate`. Do not treat the committed TypeScript client stub or a successful build as database verification.

### Migration history mismatch

On a disposable local database, use `npm run db:reset`. Do not delete migration history or reset a shared database. For a non-disposable database, inspect `npm run db:deploy` and resolve the migration state deliberately.

### Port already in use

Change `API_PORT` for the API or stop the process occupying port 5432/4000. Keep `DATABASE_URL` aligned with the PostgreSQL port.

### Windows PowerShell command differences

Use `Copy-Item` instead of `cp`. Use `Invoke-RestMethod` instead of `curl` when you want structured JSON. All database/API lifecycle commands are npm scripts and work from PowerShell without Bash.

## Local verification checklist

1. Install Node 22 and Docker Desktop.
2. Run `npm install`.
3. Copy and edit `.env`.
4. Run `npm run db:start`.
5. Run `npm run db:validate`.
6. Run `npm run db:generate`.
7. Run `npm run db:deploy` or `npm run db:migrate`.
8. Run `npm run db:seed`.
9. Run `npm run typecheck`, `npm run lint`, and `npm run build`.
10. Run `npm test --workspace=@festify/api`.
11. Run `npm run dev:api` and smoke-test `/health`, auth, events, categories, and OpenAPI.
12. Run `npm run db:studio` to inspect records if needed.
