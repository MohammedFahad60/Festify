# Development

```bash
npm install
cp .env.example .env
npm run db:start
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

The web app runs with `npm run dev:web`; the API runs with `npm run dev:api`. Use `npm run build`, `npm test --workspaces`, and `npm run lint` before submitting changes. Docker PostgreSQL is the primary development database. `npm run db:offline` verifies the PGlite fallback runtime.

Authentication development testing can use `AUTH_DEV_TOKENS=true`; registration and forgot-password responses then include a `devToken`. This is disabled automatically when `NODE_ENV=production`. Never enable it in a deployed environment.
