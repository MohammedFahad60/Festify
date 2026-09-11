# Security

Passwords are bcrypt hashes and are never returned. Authentication is cookie-based with httpOnly cookies, short-lived JWT access tokens, and rotating opaque refresh sessions hashed with SHA-256. Authorization is evaluated server-side from the authenticated user and organizer ownership is never accepted from request bodies.

Helmet, CORS credentials, request IDs, JSON size limits, rate limiting, Zod validation, centralized errors, and structured request logging are enabled by the API factory. Development seed credentials are local-only and must not be deployed.
