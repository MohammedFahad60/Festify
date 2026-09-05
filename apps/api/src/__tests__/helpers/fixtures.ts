import { testPrisma } from "./db.js";
import { createTestOrganizer } from "./auth.js";

/**
 * Get or create a test category. Uses existing seeded data when possible.
 */
export async function getTestCategory() {
  // Try to find an existing active category first
  const existing = await testPrisma.category.findFirst({
    where: { status: "ACTIVE" },
  });
  if (existing) return existing;

  // Create one if none exist
  return testPrisma.category.create({
    data: {
      name: `Test Category ${Date.now()}`,
      slug: `test-cat-${Date.now()}`,
      status: "ACTIVE",
    },
  });
}

/**
 * Get or create a test venue. Uses existing seeded data when possible.
 */
export async function getTestVenue() {
  // Find an existing venue with a Zod-valid UUID (v1-8).
  // The seeded venue ID 00000000-...-0001 fails Zod v4 strict UUID validation,
  // so we look for one with a proper UUID first.
  const existing = await testPrisma.venue.findFirst({
    where: {
      id: {
        not: "00000000-0000-0000-0000-000000000001",
      },
    },
  });
  if (existing) return existing;

  // Create one with a proper random UUID
  return testPrisma.venue.create({
    data: {
      name: `Test Venue ${Date.now()}`,
      address: "123 Test Street",
      city: "TestCity",
      state: "TestState",
      country: "India",
      capacity: 5000,
    },
  });
}

export interface TestFestivalOptions {
  organizerPrefix?: string;
  status?: string;
  name?: string;
  slug?: string;
  saleStartOffset?: number; // ms from now
  saleEndOffset?: number;   // ms from now
  startOffset?: number;     // ms from now (festival start)
  endOffset?: number;       // ms from now (festival end)
}

/**
 * Create a complete test festival with organizer, category, venue, and optional ticket types.
 */
export async function createTestFestival(opts: TestFestivalOptions = {}) {
  const category = await getTestCategory();
  const venue = await getTestVenue();

  const organizerPrefix = opts.organizerPrefix || `org-${Date.now()}`;
  const organizerData = await createTestOrganizer(organizerPrefix);

  const now = new Date();
  const festivalStatus = opts.status || "DRAFT";
  const name = opts.name || `Test Festival ${Date.now()}`;
  const slug =
    opts.slug || `test-festival-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const festival = await testPrisma.festival.create({
    data: {
      organizerId: organizerData.organizer.id,
      categoryId: category.id,
      venueId: venue.id,
      name,
      slug,
      description: "A test festival for automated testing",
      startDate: new Date(now.getTime() + (opts.startOffset ?? 90 * 24 * 60 * 60 * 1000)),
      endDate: new Date(now.getTime() + (opts.endOffset ?? 92 * 24 * 60 * 60 * 1000)),
      startTime: "10:00",
      endTime: "22:00",
      capacity: 5000,
      status: festivalStatus as any,
    },
  });

  return {
    festival,
    organizer: organizerData,
    category,
    venue,
  };
}

export interface TestTicketTypeOptions {
  name?: string;
  price?: number;
  quantity?: number;
  saleStartOffset?: number;
  saleEndOffset?: number;
  maxPerUser?: number;
  status?: string;
}

/**
 * Create a ticket type for a given festival.
 */
export async function createTestTicketType(
  festivalId: string,
  opts: TestTicketTypeOptions = {}
) {
  const now = new Date();
  const saleStartOffset = opts.saleStartOffset ?? -24 * 60 * 60 * 1000; // 24h ago
  const saleEndOffset = opts.saleEndOffset ?? 90 * 24 * 60 * 60 * 1000;  // 90 days from now

  return testPrisma.ticketType.create({
    data: {
      festivalId,
      name: opts.name || `Ticket Type ${Date.now()}`,
      description: "Test ticket type",
      price: opts.price ?? 500,
      quantity: opts.quantity ?? 100,
      soldQuantity: 0,
      saleStart: new Date(now.getTime() + saleStartOffset),
      saleEnd: new Date(now.getTime() + saleEndOffset),
      maxPerUser: opts.maxPerUser ?? null,
      status: (opts.status as any) || "ACTIVE",
    },
  });
}

/**
 * Create a complete order flow: festival + ticket type + order + payment.
 * Returns all created records.
 */
export async function createTestOrderFlow(
  buyerPrefix: string = "buyer",
  opts: {
    festivalStatus?: string;
    ticketPrice?: number;
    ticketQuantity?: number;
    orderQuantity?: number;
    maxPerUser?: number;
  } = {}
) {
  const { createTestUser } = await import("./auth.js");

  const { festival, organizer, category, venue } = await createTestFestival({
    organizerPrefix: organizerPrefix(buyerPrefix),
    status: opts.festivalStatus || "PUBLISHED",
  });

  const ticketType = await createTestTicketType(festival.id, {
    price: opts.ticketPrice ?? 500,
    quantity: opts.ticketQuantity ?? 100,
    maxPerUser: opts.maxPerUser,
  });

  const buyer = await createTestUser(buyerPrefix, "ATTENDEE");

  const orderQuantity = opts.orderQuantity ?? 2;

  return {
    festival,
    organizer,
    category,
    venue,
    ticketType,
    buyer,
    orderQuantity,
  };
}

function organizerPrefix(buyerPrefix: string): string {
  return `org-${buyerPrefix}`;
}
