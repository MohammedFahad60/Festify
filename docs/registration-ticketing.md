# Phase 8: registration and ticketing

Phase 8 adds the authenticated user registration and ticket wallet experience on top of the existing Express registration engine. The browser only sends event/ticket IDs and quantities. The backend recalculates prices, locks inventory, validates sale windows and capacity, creates tickets, and writes the registration/payment records transactionally.

## Routes

- `/events/[slug]/register` — authenticated ticket selection and registration submission
- `/account/registrations` — current user's registration history
- `/account/registrations/[id]` — registration detail, server total, tickets, and cancellation
- `/account/tickets` — current user's ticket wallet
- `/account/tickets/[id]` — ticket detail and safe reference fallback

Unauthenticated registration attempts redirect to `/login` with a safe `next` path. Account data is fetched only after authentication and remains ownership-filtered by the backend.

## API endpoints

The frontend consumes:

- `POST /api/v1/registrations` — accepts only `eventId` and ticket `{ticketTypeId, quantity}` selections
- `GET /api/v1/registrations` — current user's registrations
- `GET /api/v1/registrations/:id` — ownership-protected registration detail
- `GET /api/v1/registrations/:id/tickets` — ownership-protected registration tickets
- `POST /api/v1/registrations/:id/cancel` — ownership and eligibility checked server-side
- `GET /api/v1/tickets` — current user's ticket wallet
- `GET /api/v1/tickets/:id` — ownership-protected ticket detail
- `GET /api/v1/events/:slug` and `/events/:slug/ticket-types` — event and ticket selection data

Registration list/detail responses were expanded at the API boundary to include public event summary, payment status, and ticket count. Cancellation was moved into the registration service transaction so registration, ticket state, and sold inventory are reconciled together.

## Server authority

The client order summary is explicitly labelled **Client display estimate**. It is never sent as a trusted total. The registration request excludes prices, totals, status, ownership IDs, payment state, and inventory fields. The server:

- locks the event and selected ticket types
- checks publication and ticket sale windows
- checks inventory and max-per-user values
- checks duplicate registration
- checks event capacity
- calculates the final total from stored ticket prices
- creates registration items and tickets
- creates the backend payment record

Race outcomes such as sold-out inventory, capacity exhaustion, duplicate registration, or unavailable events are displayed as normal user-facing errors.

## Payment stub

The current registration engine creates a server-side `INTERNAL` payment with `SUCCESS` as part of the confirmed registration transaction. There is no separate registration payment-completion endpoint in the Phase 4 registration contract. The frontend displays the returned payment state and does not expose any client-controlled success action or add a payment provider.

The existing order/payment stub remains unchanged and is not mixed into the registration flow.

## Confirmation and cancellation

Registration detail shows:

- booking reference
- event information
- server-calculated total
- registration status
- payment status
- issued tickets

Cancellation uses the existing authenticated endpoint and a confirmation dialog. The backend now verifies ownership and confirmed status, marks the registration and tickets cancelled, and restores selected ticket inventory in one transaction. Refund behavior is not invented; payment state is displayed exactly as returned.

## Ticket wallet and QR behavior

The wallet uses the ownership-protected ticket API and displays backend-issued ticket number/code, event information, date, venue, and status. `ACTIVE` is presented as `VALID`; `USED` and `CANCELLED` remain distinct.

The current user ticket contract does not provide a presentation-safe QR image or payload. The frontend therefore does not manufacture or expose the internal QR token. It provides a readable ticket-number/code fallback. Organizer validation/check-in endpoints remain privileged and are not exposed to normal users.

## Query strategy

TanStack Query keys include:

- `registration/event/:slug`
- `registration/event/:slug/ticket-types`
- `registrations`
- `registration/:id`
- `registration/:id/tickets`
- `tickets`
- `ticket/:id`

Cancellation invalidates the registration list, registration detail, registration tickets, and ticket wallet queries. Selection queries remain cached independently.

## Security and IDOR review

Registration detail, registration tickets, ticket list, and ticket detail are authenticated and ownership constrained by the backend. The frontend does not infer ownership from IDs and never accesses Prisma/PostgreSQL. No tokens, payment credentials, trusted totals, ticket status, or QR secrets are stored in localStorage or accepted from the user.

## Testing

Frontend utility tests cover quantity clamping, selection-only payload generation, estimate separation, ticket status labels, and QR/reference fallback. Existing API, discovery, sharing, validation, and organizer tests remain active.

```text
npm run typecheck
npm run lint
npm run build
npm test --workspace=@festify/web
```

The database integration suite requires PostgreSQL and `DATABASE_URL`. It remains blocked in the Arena environment when those are unavailable; real registration concurrency and transaction behavior must be run in the documented local PostgreSQL setup.
