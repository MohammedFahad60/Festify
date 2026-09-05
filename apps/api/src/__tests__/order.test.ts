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

describe("Orders & Inventory", () => {
  let category: any;
  let venue: any;

  beforeAll(async () => {
    category = await getTestCategory();
    venue = await getTestVenue();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe("Order creation", () => {
    it("unauthenticated order creation is rejected", async () => {
      const res = await request(app).post("/api/orders").send({
        festivalId: "00000000-0000-0000-0000-000000000000",
        items: [{ ticketTypeId: "00000000-0000-0000-0000-000000000000", quantity: 1 }],
      });

      expect(res.status).toBe(401);
    });

    it("invalid ticket type is rejected", async () => {
      const { festival } = await createTestFestival({
        organizerPrefix: "ord-invalid-tt",
        status: "PUBLISHED",
      });
      const buyer = await createTestUser("ord-invalid-tt-buyer", "ATTENDEE");

      const res = await request(app)
        .post("/api/orders")
        .set("Cookie", buyer.cookie)
        .send({
          festivalId: festival.id,
          items: [
            {
              ticketTypeId: "00000000-0000-0000-0000-000000000000",
              quantity: 1,
            },
          ],
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("unpublished festival cannot be purchased", async () => {
      const { festival, organizer } = await createTestFestival({
        organizerPrefix: "ord-unpublished",
        status: "DRAFT",
      });
      const ticketType = await createTestTicketType(festival.id);
      const buyer = await createTestUser("ord-unpub-buyer", "ATTENDEE");

      const res = await request(app)
        .post("/api/orders")
        .set("Cookie", buyer.cookie)
        .send({
          festivalId: festival.id,
          items: [{ ticketTypeId: ticketType.id, quantity: 1 }],
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/not published/i);
    });

    it("inactive ticket type cannot be purchased", async () => {
      const { festival } = await createTestFestival({
        organizerPrefix: "ord-inactive-tt",
        status: "PUBLISHED",
      });
      const ticketType = await createTestTicketType(festival.id, {
        status: "INACTIVE",
      });
      const buyer = await createTestUser("ord-inactive-buyer", "ATTENDEE");

      const res = await request(app)
        .post("/api/orders")
        .set("Cookie", buyer.cookie)
        .send({
          festivalId: festival.id,
          items: [{ ticketTypeId: ticketType.id, quantity: 1 }],
        });

      expect(res.status).toBe(409);
    });

    it("server calculates the total price (client cannot manipulate)", async () => {
      const { festival } = await createTestFestival({
        organizerPrefix: "ord-price-calc",
        status: "PUBLISHED",
      });
      const ticketType = await createTestTicketType(festival.id, {
        price: 750,
        quantity: 50,
      });
      const buyer = await createTestUser("ord-price-buyer", "ATTENDEE");

      const res = await request(app)
        .post("/api/orders")
        .set("Cookie", buyer.cookie)
        .send({
          festivalId: festival.id,
          items: [{ ticketTypeId: ticketType.id, quantity: 2 }],
        });

      expect(res.status).toBe(201);
      const order = res.body.data.order;
      // Total should be 750 * 2 = 1500, not anything the client sends
      expect(Number(order.totalAmount)).toBe(1500);
      expect(order.items[0].unitPrice).toBeDefined();
      expect(Number(order.items[0].unitPrice)).toBe(750);
      expect(Number(order.items[0].totalPrice)).toBe(1500);
    });

    it("quantity limits work - maxPerUser enforced", async () => {
      const { festival } = await createTestFestival({
        organizerPrefix: "ord-maxper",
        status: "PUBLISHED",
      });
      const ticketType = await createTestTicketType(festival.id, {
        price: 100,
        quantity: 100,
        maxPerUser: 2,
      });
      const buyer = await createTestUser("ord-maxper-buyer", "ATTENDEE");

      // First order: 2 tickets (should succeed)
      const res1 = await request(app)
        .post("/api/orders")
        .set("Cookie", buyer.cookie)
        .send({
          festivalId: festival.id,
          items: [{ ticketTypeId: ticketType.id, quantity: 2 }],
        });

      expect(res1.status).toBe(201);

      // Second order: 1 more ticket (should fail, would exceed maxPerUser of 2)
      const res2 = await request(app)
        .post("/api/orders")
        .set("Cookie", buyer.cookie)
        .send({
          festivalId: festival.id,
          items: [{ ticketTypeId: ticketType.id, quantity: 1 }],
        });

      expect(res2.status).toBe(409);
    });

    it("insufficient inventory does not create an order", async () => {
      const { festival } = await createTestFestival({
        organizerPrefix: "ord-insuf",
        status: "PUBLISHED",
      });
      const ticketType = await createTestTicketType(festival.id, {
        price: 100,
        quantity: 2,
      });
      const buyer = await createTestUser("ord-insuf-buyer", "ATTENDEE");

      const res = await request(app)
        .post("/api/orders")
        .set("Cookie", buyer.cookie)
        .send({
          festivalId: festival.id,
          items: [{ ticketTypeId: ticketType.id, quantity: 5 }],
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/not enough/i);
    });

    it("inventory is reserved correctly", async () => {
      const { festival } = await createTestFestival({
        organizerPrefix: "ord-reserve",
        status: "PUBLISHED",
      });
      const ticketType = await createTestTicketType(festival.id, {
        price: 100,
        quantity: 10,
      });
      const buyer = await createTestUser("ord-reserve-buyer", "ATTENDEE");

      const res = await request(app)
        .post("/api/orders")
        .set("Cookie", buyer.cookie)
        .send({
          festivalId: festival.id,
          items: [{ ticketTypeId: ticketType.id, quantity: 3 }],
        });

      expect(res.status).toBe(201);

      const updatedTT = await testPrisma.ticketType.findUnique({
        where: { id: ticketType.id },
      });
      expect(updatedTT!.soldQuantity).toBe(3);
    });

    it("failed purchase does not mutate soldQuantity", async () => {
      const { festival } = await createTestFestival({
        organizerPrefix: "ord-fail-mut",
        status: "PUBLISHED",
      });
      const ticketType = await createTestTicketType(festival.id, {
        price: 100,
        quantity: 1,
        maxPerUser: 1,
      });
      const buyer = await createTestUser("ord-fail-mut-buyer", "ATTENDEE");

      // First order succeeds
      await request(app)
        .post("/api/orders")
        .set("Cookie", buyer.cookie)
        .send({
          festivalId: festival.id,
          items: [{ ticketTypeId: ticketType.id, quantity: 1 }],
        });

      const afterFirst = await testPrisma.ticketType.findUnique({
        where: { id: ticketType.id },
      });
      expect(afterFirst!.soldQuantity).toBe(1);

      // Second order fails (maxPerUser exceeded)
      await request(app)
        .post("/api/orders")
        .set("Cookie", buyer.cookie)
        .send({
          festivalId: festival.id,
          items: [{ ticketTypeId: ticketType.id, quantity: 1 }],
        });

      const afterSecond = await testPrisma.ticketType.findUnique({
        where: { id: ticketType.id },
      });
      expect(afterSecond!.soldQuantity).toBe(1); // unchanged
    });
  });

  describe("Order access", () => {
    it("users can read their own orders", async () => {
      const buyer = await createTestUser("ord-read-own", "ATTENDEE");

      const res = await request(app)
        .get("/api/orders")
        .set("Cookie", buyer.cookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.orders)).toBe(true);
    });

    it("users cannot read other users' orders", async () => {
      const { festival } = await createTestFestival({
        organizerPrefix: "ord-other-read",
        status: "PUBLISHED",
      });
      const ticketType = await createTestTicketType(festival.id, {
        price: 100,
        quantity: 50,
      });
      const buyer1 = await createTestUser("ord-read1", "ATTENDEE");
      const buyer2 = await createTestUser("ord-read2", "ATTENDEE");

      // buyer1 creates an order
      const createRes = await request(app)
        .post("/api/orders")
        .set("Cookie", buyer1.cookie)
        .send({
          festivalId: festival.id,
          items: [{ ticketTypeId: ticketType.id, quantity: 1 }],
        });

      const orderId = createRes.body.data.order.id;

      // buyer2 tries to read buyer1's order
      const res = await request(app)
        .get(`/api/orders/${orderId}`)
        .set("Cookie", buyer2.cookie);

      expect(res.status).toBe(403);
    });
  });

  describe("Concurrency", () => {
    it("concurrent orders cannot oversell inventory", async () => {
      const { festival } = await createTestFestival({
        organizerPrefix: "ord-concurrent",
        status: "PUBLISHED",
      });
      const ticketType = await createTestTicketType(festival.id, {
        price: 100,
        quantity: 3,
      });

      // Create 5 concurrent buyers
      const buyers = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          createTestUser(`ord-concurrent-buyer-${i}`, "ATTENDEE")
        )
      );

      // All try to buy 1 ticket simultaneously
      const results = await Promise.all(
        buyers.map((buyer) =>
          request(app)
            .post("/api/orders")
            .set("Cookie", buyer.cookie)
            .send({
              festivalId: festival.id,
              items: [{ ticketTypeId: ticketType.id, quantity: 1 }],
            })
        )
      );

      // Under driver-adapter limitations, concurrent SERIALIZABLE transactions
      // may all fail with P2034 (write conflict). The critical invariant is:
      // soldQuantity never exceeds the available inventory of 3.
      // This is enforced by the WHERE clause: soldQuantity <= quantity - requested
      const finalTT = await testPrisma.ticketType.findUnique({
        where: { id: ticketType.id },
      });
      expect(finalTT!.soldQuantity).toBeLessThanOrEqual(3);
      expect(finalTT!.soldQuantity).toBeGreaterThanOrEqual(0);
    });
  });
});
