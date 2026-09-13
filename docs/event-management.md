# Phase 7: organizer event management

Phase 7 adds an organizer-facing event-management workspace. It uses the Express API through relative `/api/v1` requests and never accesses Prisma or PostgreSQL from the browser.

## Organizer routes

- `/organizer` — lightweight organizer overview using existing dashboard counts
- `/organizer/events` — organizer-owned event list
- `/organizer/events/new` — create a draft event
- `/organizer/events/[id]` — lifecycle actions, statistics, attendees, and ticket types
- `/organizer/events/[id]/edit` — edit an owned draft event
- `/organizer/events/[id]/check-in` — minimum supported ticket check-in entry point
- `/organizer/profile` — supported public organizer profile fields

The existing `/organizer/festivals/*` routes remain for compatibility with the previous migration surface. New Phase 7 management uses the current `/events` contracts.

## API contracts

The frontend consumes:

- `GET /events/mine` — authenticated organizer-owned events
- `GET /events/manage/:id` — authenticated organizer-owned event detail, including drafts
- `POST /events` — create draft event using the shared `eventSchema` contract
- `PATCH /events/:id` — update an owned event
- `DELETE /events/:id` — existing backend cancellation/deletion behavior; the UI only exposes it for drafts
- `POST /events/:id/publish` — publish an event
- `POST /events/:id/cancel` — cancel a published event
- `GET /events/:eventId/ticket-types` — ticket types
- `POST /events/:eventId/ticket-types` — create ticket type
- `PATCH /ticket-types/:id` — update an owned ticket type
- `DELETE /ticket-types/:id` — backend deactivates an owned ticket type
- `GET /events/:id/statistics` — management statistics
- `GET /events/:id/attendees` — attendee records
- `GET /organizer/dashboard` — overview counts
- `GET /organizer/profile` and `PUT /organizer/profile` — profile fields
- `POST /check-ins` — supported check-in operation

The owned-event listing/detail endpoints were added because the existing Phase 4 current event API had create/update/lifecycle operations but no authenticated organizer event list or draft detail endpoint. They enforce organizer/admin roles and organizer ownership server-side before returning data.

## Event workflow

Event forms use `eventSchema` from `@festify/validation`. Supported fields include title, slug, description, category, venue, city, start/end timestamps, and capacity. New records are created through the API's draft workflow; the frontend never automatically publishes.

The UI reflects the supported lifecycle:

- Draft: edit, publish, delete draft
- Published: edit is not offered by the new management surface, cancel, view, check in
- Cancelled: view-only management state

Confirmation dialogs protect cancellation and draft deletion. Backend responses remain authoritative if state changes concurrently.

## Ticket types

Ticket forms use the shared `ticketTypeSchema` and validate names, non-negative prices, positive quantities, and sale windows. The frontend sends no sold totals, registration totals, payment fields, or inventory accounting values. Ticket updates and deletes are reconciled through TanStack Query invalidation.

## Stats and attendees

The event detail page displays only fields returned by the existing APIs: registrations, confirmed registrations, tickets issued, check-ins, capacity, attendee name/email, booking reference, registration status, and created date where available. Revenue is not displayed in the UI even though the statistics contract may return it.

## Authorization model

The organizer layout redirects unauthenticated users for UX only. Every organizer API call still relies on backend authentication, role checks, and ownership checks. Client-controlled IDs, organizer IDs, user IDs, prices, capacities, and inventory values are not trusted for authorization or accounting.

## Query strategy

Stable TanStack Query keys are used for:

- `organizer/dashboard`
- `organizer/events`
- `organizer/event/:id`
- `organizer/event/:id/tickets`
- `organizer/event/:id/stats`
- `organizer/event/:id/attendees`
- `organizer/profile`
- `categories` and `catalog/venues`

Mutations invalidate the owned event list, event detail, ticket list, and profile queries that they affect.

## Testing

Frontend tests cover event and ticket validation contracts, including invalid date ranges, required event fields, negative prices, zero quantities, and reversed sale windows. Existing API client and Phase 6 tests remain active.

Run:

```text
npm run typecheck
npm run lint
npm run build
npm test --workspace=@festify/web
```

The root API integration suite requires PostgreSQL and a configured `DATABASE_URL`; it remains blocked in the Arena environment when those services are unavailable.
