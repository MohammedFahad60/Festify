# Migrations

This directory will contain Prisma migrations once `npx prisma migrate dev` is run with a real database.

For now it exists to satisfy `prisma.config.ts` and `migrate status`.

To create the initial migration (requires DATABASE_URL and network for engines):

```
npx prisma migrate dev --name init
```

In CI/production, apply with:

```
npx prisma migrate deploy
```
