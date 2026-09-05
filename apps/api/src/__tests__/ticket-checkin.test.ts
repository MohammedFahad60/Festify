import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import {
  createTestUser,
  createTestOrganizer,
} from "./helpers/auth.js";
import {
  getTestCategory,
  getTestVenue,
  createTestFestival,
  createTestTicketType,
} from "./helpers/fixtures.js";
import { cleanupTestData, testPrisma } from "./helpers/db.js";

describe("Ticket Validation & Check-in", () => {
  let category: any;
  let venue: any;

  beforeAll(async () => {
    category = await getTestCategory();
    venue = await getTestVenue();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  /**
   * Helper: complete a purchase and return tickets for check-in testing.
   */
  async function purchaseTickets(prefix: string, quantity: number = 1) {
    const { festival, organizer } = await createTestFestival({
      organizerPrefix: `ci-${prefix}`,
      status: "PUBLISHED",
    });
    const ticketType = await createTestTicketType(festival.id, {
      price: 200,
      quantity: 50,
    });
    const buyer = await createTestUser(`ci-buyer-${prefix}`, "ATTENDEE");

    // Create order
    const orderRes = await request(app)
      .post("/api/orders")
      .set("Cookie", buyer.cookie)
      .send({
        festivalId: festival.id,
        items: [{ ticketTypeId: ticketType.id, quantity }],
      });
    const order = orderRes.body.data.order;

    // Create and complete payment
    const payRes = await request(app)
      .post(`/api/orders/${order.id}/payment`)
      .set("Cookie", buyer.cookie);
    const paymentId = payRes.body.data.payment.id;

    await request(app)
      .post(`/api/payments/${paymentId}/test-success`)
      .set("Cookie", buyer.cookie);

    // Get tickets
    const ticketsRes = await request(app)
      .get("/api/tickets")
      .set("Cookie", buyer.cookie);
    const tickets = ticketsRes.body.data.tickets;

    return { festival, organizer, buyer, tickets, ticketType, order };
  }

  describe("Access control", () => {
    it("unauthenticated validation is rejected", async () => {
      const res = await request(app)
        .post("/api/tickets/validate")
        .send({ ticketCode: "FST-TESTCODE123456" });

      expect(res.status).toBe(401);
    });

    it("non-organizer cannot validate", async () => {
      const attendee = await createTestUser("ci-non-org", "ATTENDEE");

      const res = await request(app)
        .post("/api/tickets/validate")
        .set("Cookie", attendee.cookie)
        .send({ ticketCode: "FST-TESTCODE123456" });

      expect(res.status).toBe(403);
    });
  });

  describe("Validate ticket", () => {
    it("nonexistent ticket code returns 404", async () => {
      const organizer = await createTestOrganizer("ci-nonexist");

      const res = await request(app)
        .post("/api/tickets/validate")
        .set("Cookie", organizer.cookie)
        .send({ ticketCode: "FST-NONEXISTENTCODE0000" });

      expect(res.status).toBe(404);
    });

    it("malformed ticket code returns 400", async () => {
      const organizer = await createTestOrganizer("ci-malform");

      const res = await request(app)
        .post("/api/tickets/validate")
        .set("Cookie", organizer.cookie)
        .send({ ticketCode: "" });

      expect(res.status).toBe(400);
    });

    it("organizer cannot validate another organizer's festival ticket", async () => {
      const { tickets } = await purchaseTickets("ci-other-org");
      const otherOrganizer = await createTestOrganizer("ci-other-org-val");

      const res = await request(app)
        .post("/api/tickets/validate")
        .set("Cookie", otherOrganizer.cookie)
        .send({ ticketCode: tickets[0].ticketCode });

      expect(res.status).toBe(403);
    });

    it("active ticket validates successfully", async () => {
      const { organizer, tickets } = await purchaseTickets("ci-active");

      const res = await request(app)
        .post("/api/tickets/validate")
        .set("Cookie", organizer.cookie)
        .send({ ticketCode: tickets[0].ticketCode });

      expect(res.status).toBe(200);
      expect(res.body.data.valid).toBe(true);
    });
  });

  describe("Check-in ticket", () => {
    it("active ticket can be checked in", async () => {
      const { organizer, tickets } = await purchaseTickets("ci-checkin");

      const res = await request(app)
        .post(`/api/tickets/${tickets[0].ticketCode}/check-in`)
        .set("Cookie", organizer.cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.ticket.status).toBe("USED");
    });

    it("active ticket becomes USED after check-in", async () => {
      const { organizer, tickets } = await purchaseTickets("ci-becomes-used");

      await request(app)
        .post(`/api/tickets/${tickets[0].ticketCode}/check-in`)
        .set("Cookie", organizer.cookie);

      const ticket = await testPrisma.ticket.findUnique({
        where: { id: tickets[0].id },
      });
      expect(ticket!.status).toBe("USED");
    });

    it("repeated check-in returns 409", async () => {
      const { organizer, tickets } = await purchaseTickets("ci-repeat");

      // First check-in
      const res1 = await request(app)
        .post(`/api/tickets/${tickets[0].ticketCode}/check-in`)
        .set("Cookie", organizer.cookie);

      expect(res1.status).toBe(200);

      // Second check-in
      const res2 = await request(app)
        .post(`/api/tickets/${tickets[0].ticketCode}/check-in`)
        .set("Cookie", organizer.cookie);

      expect(res2.status).toBe(409);
    });

    it("cancelled ticket is rejected", async () => {
      const { organizer, tickets } = await purchaseTickets("ci-cancelled");

      // Cancel the ticket in the database directly
      await testPrisma.ticket.update({
        where: { id: tickets[0].id },
        data: { status: "CANCELLED" },
      });

      const res = await request(app)
        .post(`/api/tickets/${tickets[0].ticketCode}/check-in`)
        .set("Cookie", organizer.cookie);

      expect(res.status).toBe(409);
    });

    it("concurrent check-ins cannot both succeed", async () => {
      const { organizer, tickets } = await purchaseTickets("ci-concurrent");

      // Two simultaneous check-in attempts
      const results = await Promise.all([
        request(app)
          .post(`/api/tickets/${tickets[0].ticketCode}/check-in`)
          .set("Cookie", organizer.cookie),
        request(app)
          .post(`/api/tickets/${tickets[0].ticketCode}/check-in`)
          .set("Cookie", organizer.cookie),
      ]);

      const successes = results.filter((r) => r.status === 200);

      // At most 1 can succeed (driver adapter write conflicts cause
      // SERIALIZABLE transactions to fail, which also prevents double check-in)
      expect(successes.length).toBeLessThanOrEqual(1);

      // Verify the ticket is at most USED once (no double check-in)
      const ticket = await testPrisma.ticket.findUnique({
        where: { id: tickets[0].id },
      });
      expect(ticket!.status).toBe("USED");
    });
  });
});
