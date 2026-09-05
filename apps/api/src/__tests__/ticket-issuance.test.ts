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

describe("Ticket Issuance", () => {
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
   * Helper: complete a purchase flow and return the created tickets.
   */
  async function completePurchase(prefix: string, quantity: number = 2) {
    const { festival } = await createTestFestival({
      organizerPrefix: `ti-${prefix}`,
      status: "PUBLISHED",
    });
    const ticketType = await createTestTicketType(festival.id, {
      price: 300,
      quantity: 50,
    });
    const buyer = await createTestUser(`ti-buyer-${prefix}`, "ATTENDEE");

    // Create order
    const orderRes = await request(app)
      .post("/api/orders")
      .set("Cookie", buyer.cookie)
      .send({
        festivalId: festival.id,
        items: [{ ticketTypeId: ticketType.id, quantity }],
      });

    expect(orderRes.status).toBe(201);
    const order = orderRes.body.data.order;

    // Create payment
    const payRes = await request(app)
      .post(`/api/orders/${order.id}/payment`)
      .set("Cookie", buyer.cookie);

    expect(payRes.status).toBe(201);
    const paymentId = payRes.body.data.payment.id;

    // Mark payment as successful
    const successRes = await request(app)
      .post(`/api/payments/${paymentId}/test-success`)
      .set("Cookie", buyer.cookie);

    expect(successRes.status).toBe(200);

    // Fetch tickets
    const ticketsRes = await request(app)
      .get("/api/tickets")
      .set("Cookie", buyer.cookie);

    expect(ticketsRes.status).toBe(200);

    return {
      festival,
      ticketType,
      buyer,
      order,
      tickets: ticketsRes.body.data.tickets,
    };
  }

  describe("Ticket creation on payment", () => {
    it("successful payment results in ticket issuance", async () => {
      const { tickets } = await completePurchase("ti-issuance");
      expect(tickets.length).toBeGreaterThan(0);
    });

    it("one ticket is created for each purchased quantity", async () => {
      const { tickets } = await completePurchase("ti-qty", 3);
      expect(tickets.length).toBe(3);
    });

    it("ticket codes are unique", async () => {
      const { tickets } = await completePurchase("ti-unique", 5);
      const codes = tickets.map((t: any) => t.ticketCode);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it("ticket belongs to the correct user", async () => {
      const { tickets, buyer } = await completePurchase("ti-owner");
      for (const ticket of tickets) {
        expect(ticket.userId).toBe(buyer.user.id);
      }
    });

    it("ticket belongs to the correct order/ticket type", async () => {
      const { tickets, order, ticketType } = await completePurchase("ti-rel");
      for (const ticket of tickets) {
        expect(ticket.orderId).toBe(order.id);
        expect(ticket.ticketTypeId).toBe(ticketType.id);
      }
    });
  });

  describe("Ticket access control", () => {
    it("unauthenticated ticket reads are rejected", async () => {
      const res = await request(app).get("/api/tickets");
      expect(res.status).toBe(401);
    });

    it("another user cannot read the ticket", async () => {
      const { tickets, buyer } = await completePurchase("ti-other-user");

      const otherUser = await createTestUser("ti-other-read", "ATTENDEE");

      // Other user lists their tickets (should not include the purchased ones)
      const res = await request(app)
        .get("/api/tickets")
        .set("Cookie", otherUser.cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.tickets.length).toBe(0);

      // Other user tries to access specific ticket
      if (tickets.length > 0) {
        const res2 = await request(app)
          .get(`/api/tickets/${tickets[0].id}`)
          .set("Cookie", otherUser.cookie);

        expect(res2.status).toBe(403);
      }
    });
  });
});
