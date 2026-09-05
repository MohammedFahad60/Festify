# Backend Testing

The backend test suite uses Vitest, Supertest, and the generated Prisma client.

## Commands

Run from the repository root:

```powershell
npm test --workspace=@festify/api
cd apps/api
npx tsc --noEmit
```

The test files are under `apps/api/src/__tests__` and currently contain 88 tests across authentication, authorization, festivals, ticket types, orders and inventory, payments, ticket issuance, check-in, and security/data exposure.

## Database isolation

Tests do not run `prisma migrate reset`, truncate tables, or modify seeded users and production-like fixtures. Test records are identified by the `test-` email prefix and are removed by the shared cleanup helper after each suite, in foreign-key dependency order.

For a safer isolated database, set `TEST_DATABASE_URL` before running the suite. The test helper prefers this variable, then the repository `DATABASE_URL` for local compatibility, and finally its documented local fallback. When using `TEST_DATABASE_URL`, apply the existing migrations to that database before running tests; do not point it at a production database.

Test fixtures use existing active categories and non-placeholder venues when available. If those records are absent, the helpers create test-specific category/venue records; these are harmless shared test support records and are not removed because they may be reused by later suites.

## External services

Payment tests use the existing development `test-success` and `test-fail` endpoints. No real payment, email, or SMS provider is contacted.

Concurrency tests intentionally exercise serializable transaction conflicts. A failed transaction may log a Prisma `P2034` write-conflict diagnostic; assertions verify the business invariant that inventory is not oversold and a ticket cannot be checked in twice.
