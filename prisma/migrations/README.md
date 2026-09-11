# Prisma migrations

The initial migration is `00000000000000_init/migration.sql`. Apply it to a clean PostgreSQL 16 database with:

```text
npm run db:deploy
```

For local development, `npm run db:migrate -- --name descriptive-change` creates a new migration after the Prisma engine is available. Never use `migrate reset` against shared or production databases.

If Prisma cannot download its engine from `https://binaries.prisma.sh`, generation/validation/migration commands cannot be considered verified. See `docs/local-development.md`.
