# Phase 6: event discovery

Festify's public event discovery experience is available at `/` and `/events`. It consumes the existing Express v1 event APIs through the Next rewrite; it does not access Prisma or PostgreSQL from the browser.

## Routes

- `/` — discovery home with featured events and the published event list
- `/events` — the shareable, filterable event directory
- `/events/[slug]` — public event detail, ticket information, favorites, and sharing

The legacy `/festivals/[id]` route remains for existing Phase 4/5 compatibility and was not repurposed.

## URL parameters

Discovery state is represented by query parameters so refresh, sharing, and browser navigation preserve the current view:

- `search` — backend-authoritative title/description search, debounced by 350 ms
- `category` — category slug or ID supported by the API
- `city` — case-insensitive city search
- `dateFrom`, `dateTo` — ISO date bounds
- `priceMin`, `priceMax` — non-negative ticket-price bounds
- `featured=true` — featured-only results
- `sort` — one of `created`, `date`, `title`, or `price`
- `order` — `asc` or `desc` when supplied
- `page` — one-based page number

Example: `/events?search=music&city=Bengaluru&category=concert&page=2`.

Invalid sort, order, numeric price, and page values are removed before a request. The backend still validates every request.

## Existing API contracts consumed

The frontend uses these existing `/api/v1` endpoints:

- `GET /events` — published, paginated event listing; returns top-level `rows` and `meta`
- `GET /events/featured` — featured listing using the existing featured query behavior
- `GET /events/:slug` — published event detail
- `GET /events/:eventId/ticket-types` — public ticket-type listing
- `GET /categories` — active category options
- `GET /users/me/favorites` — authenticated favorite state
- `POST /users/me/favorites/:eventId` — favorite an event
- `DELETE /users/me/favorites/:eventId` — unfavorite an event

The raw event and ticket-type wire shapes are documented in `@festify/types` as `DiscoveryEvent` and `DiscoveryTicketType`. Their snake_case timestamp and database-shaped names match the Phase 4 response contract; no browser-side database access or duplicated API transformation layer was added.

## Query strategy

TanStack Query owns event discovery state:

- `events` keys include the normalized URL query object
- `featured-events` uses an independent key and failure boundary
- `categories` is cached for five minutes
- event detail and ticket types use slug-scoped keys and a one-minute stale time
- favorites use a shared `favorites` key and are invalidated after add/remove mutations
- list changes retain previous data while a new filter result loads

The list is server-paginated with a maximum request size of 12 for the UI. No full event dataset is downloaded for client-side filtering or pagination.

## Interaction behavior

- Desktop filters use a structured filter grid; tablet/mobile use a keyboard-friendly modal filter panel.
- Search updates the URL after a short debounce and then requests the backend search result.
- Cards use semantic links to `/events/[slug]`, with an independent accessible favorite button.
- Unauthenticated favorite clicks send the user to login with a `next` path; authenticated changes use the existing API and reconcile through Query invalidation.
- Event details show public description, date/time, location when supplied, status, category, organizer when supplied, ticket name/description/price, sale window, and a clear future-phase registration note.
- Sharing uses `navigator.share` where available and `navigator.clipboard.writeText` as the fallback.

## SEO

`/events` has discovery-specific metadata. Event detail pages generate a safe title from the public slug, a generic public description, a canonical path, and Open Graph title/description. Private data is not fetched into metadata or exposed there.

## Loading and failures

Featured failures are isolated from the main list. The UI provides skeleton loading grids, filter/search empty states, retryable list/detail errors, ticket loading/error states, and a ticket-unavailable empty state. API messages are normalized through the Phase 5 friendly-error helper.

## Testing

Frontend checks include URL normalization for supported filters and sort values, existing API relative URL/credentials and refresh tests, and shared validation tests. Run:

```text
npm run typecheck
npm run lint
npm run build
npm test --workspace=@festify/web
```

Database-dependent backend tests still require the unavailable Arena PostgreSQL/Prisma environment and are reported separately in the implementation summary.
