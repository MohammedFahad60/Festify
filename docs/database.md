# Database

Festify uses PostgreSQL 16 and Prisma 7 with `@prisma/adapter-pg`. The schema is in `prisma/schema.prisma`; all domain timestamps use PostgreSQL `timestamptz(3)` and money uses `numeric(10,2)`. Foreign-key actions are explicit, including cascade for owned records, restrict for referenced catalog records, and set-null for optional venues/audit actors.

## Commands

```bash
npm run db:start
npm run db:generate
npm run db:migrate -- --name change-name
npm run db:deploy
npm run db:seed
npm run db:reset
npm run db:studio
npm run db:stop
npm run db:offline
```

The development seed is deterministic and safe to rerun. It creates admin@festify.local, organizer@festify.local, and user@festify.local. The password is `FestifyDevOnly!2026`; never use these credentials outside local development.

For a clean verification database, set a fresh `DATABASE_URL` and run `npm run db:deploy`, followed by `npm run db:seed`.
