# API

The versioned REST API is mounted at `/api/v1` (the `/api` mount remains a temporary compatibility alias). Health is available at `/health` and `/api/v1/health`.

Responses use `{ success, data, message }` for success, list responses add `{ meta: { page, limit, total, totalPages, hasNext, hasPrev } }`, and failures use `{ success: false, error: { code, message, details } }`.

Authentication endpoints are available under `/api/v1/auth`: register, login, logout, refresh, me, forgot-password, reset-password, verify-email, change-password, and organizer. Auth uses httpOnly `festify_access` and `festify_refresh` cookies. Registration and password recovery return a development-only `devToken` when `AUTH_DEV_TOKENS=true` (enabled by default outside production).

The API factory is `apps/api/src/app.ts`; it never calls `listen`, making it suitable for Supertest. `server.ts` is the process entry point. OpenAPI is planned at `/api/v1/openapi.json`; endpoint modules are under `apps/api/src/modules`.
