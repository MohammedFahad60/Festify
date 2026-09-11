# Security

Passwords use bcrypt cost 12 and strength checks (length, upper/lowercase, number, and common-password rejection) and are never returned. Authentication uses `festify_access` (HS256, 15 minutes) and `festify_refresh` (48-byte opaque, 30 days), both httpOnly. Refresh hashes use SHA-256, rotate on every refresh, and reuse revokes the session family. Access tokens include signed user, role, and session identifiers; middleware checks both the JWT and live user/session state.

Registration, login, logout, refresh reuse, verification, password changes/resets, and organizer requests are audited. Verification/reset tokens are single-use hashes and raw values are never stored. Authentication routes use IP and email keyed in-memory rate limits. Authorization is evaluated server-side from the authenticated user and organizer ownership is never accepted from request bodies.

Helmet, CORS credentials, request IDs, JSON size limits, rate limiting, Zod validation, centralized errors, and structured request logging are enabled by the API factory. Development seed credentials are local-only and must not be deployed.
