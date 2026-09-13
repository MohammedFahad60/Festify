# Frontend foundation

Festify's frontend is a Next.js 15 App Router application with React 19, TypeScript, Tailwind CSS 4, TanStack Query, React Hook Form, and shared Zod contracts from `@festify/validation`.

## Start locally

From the repository root:

```text
npm install
npm run dev:api
npm run dev:web
```

The browser opens at `http://localhost:3000`. Browser API requests use relative `/api/v1/...` URLs. `apps/web/next.config.js` rewrites them to the Express API using the server-only `NEXT_PUBLIC_API_URL` rewrite destination (default `http://localhost:4000`). The browser never reads or stores access/refresh cookies.

## Structure

- `apps/web/app/layout.tsx` — document metadata, skip link, shared shell, providers
- `apps/web/app/loading.tsx`, `error.tsx`, `not-found.tsx` — App Router states
- `apps/web/components/providers.tsx` — QueryClient and auth providers
- `apps/web/lib/api.ts` — typed envelope-aware client, cookie credentials, one-shot refresh/retry
- `apps/web/lib/auth.tsx` — current-user query, logout, auth hooks
- `apps/web/components/ui.tsx` — accessible buttons, cards, fields, alerts, skeletons, dialog, empty/error states
- `apps/web/components/header.tsx` — responsive public/authenticated navigation
- `apps/web/app/login`, `register`, `forgot-password`, `reset-password`, `verify-email`, `settings/password` — authentication foundation pages
- `apps/web/app/account`, `favorites`, `notifications` — authenticated user foundation pages

Existing legacy festival/order/organizer/admin screens remain available for the backend migration; complete product UX belongs to later phases.

## Authentication

Authentication is API-driven. `AuthProvider` calls `GET /api/v1/auth/me`; it does not inspect cookies. Login/register/logout call the Express API with `credentials: include`. On a 401, the API client makes one refresh request and retries the original request once. It never retries the refresh endpoint and never stores tokens in localStorage.

`useRequireAuth()` provides client-side navigation to `/login` for protected foundation pages. This is only UX protection; backend authorization remains authoritative.

## Server state

TanStack Query owns remote API state. Defaults use a 30-second stale time, no focus refetch, one retry for ordinary queries, and no mutation retry. Mutations invalidate relevant query keys explicitly. Local form/menu state remains in React state and React Hook Form.

## Validation and errors

Forms use React Hook Form with `zodResolver` and schemas from `@festify/validation`. Client validation improves UX only; the API remains authoritative. `api.ts` normalizes API envelopes and exposes safe user-facing errors without SQL, stack traces, or secrets.

## Environment

Only `NEXT_PUBLIC_API_URL` may be used by Next configuration for the server-side rewrite destination. Do not put `DATABASE_URL`, `JWT_SECRET`, SMTP credentials, or other private values in frontend environment variables. In normal local development, the browser should continue using relative URLs.

## Tests and checks

```text
npm run typecheck
npm run lint
npm run build
npm test --workspace=@festify/web
```

Frontend tests cover relative API URLs, credentials, one-shot refresh/retry, and authentication form contracts. The full root test command also runs backend tests, which require the separate PostgreSQL/Prisma setup documented in `docs/local-development.md`.

## Accessibility baseline

The foundation includes semantic labels, error regions, visible focus rings, keyboard-friendly links/buttons, skip navigation, dialog escape/focus restoration, responsive navigation, reduced-motion CSS, and status text that does not rely on color alone.
