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
