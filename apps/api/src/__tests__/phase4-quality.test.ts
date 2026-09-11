import { describe, expect, it } from "vitest";
import { categorySchema, eventQuerySchema, registrationSchema, ticketTypeUpdateSchema } from "@festify/validation";

describe("Phase 4 validation contracts", () => {
  it("bounds pagination and rejects unsupported event sorting", () => {
    expect(eventQuerySchema.safeParse({ page: "0" }).success).toBe(false);
    expect(eventQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
    expect(eventQuerySchema.safeParse({ sort: "passwordHash" }).success).toBe(false);
    expect(eventQuerySchema.parse({ featured: "true", page: "2", limit: "20" }).featured).toBe("true");
  });
  it("does not accept client-controlled registration totals", () => {
    const result = registrationSchema.safeParse({ eventId: "00000000-0000-0000-0000-000000000001", total: 0, items: [] });
    expect(result.success).toBe(false);
  });
  it("validates ticket type updates and category sort order", () => {
    expect(ticketTypeUpdateSchema.safeParse({ price: -1 }).success).toBe(false);
    expect(ticketTypeUpdateSchema.safeParse({ saleStart: "2027-02-01", saleEnd: "2027-01-01" }).success).toBe(false);
    expect(categorySchema.parse({ name: "Music", slug: "music" }).sortOrder).toBe(0);
  });
});
