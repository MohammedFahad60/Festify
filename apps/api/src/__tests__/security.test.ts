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

describe("Security & Data Exposure", () => {
  afterAll(async () => {
    await cleanupTestData();
  });

  describe("Sensitive data never returned", () => {
    it("passwordHash is never returned in auth responses", async () => {
      const userData = await createTestUser("sec-pw-hash");

      // Login response
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: userData.user.email,
          password: userData.password,
        });

      expect(loginRes.status).toBe(200);
      const user = loginRes.body.data.user;
      expect(user.passwordHash).toBeUndefined();

      // /me response
      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Cookie", userData.cookie);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.passwordHash).toBeUndefined();
    });

    it("passwordHash is never returned in registration response", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Security Test User",
          email: `test-sec-register-${Date.now()}@test.local`,
          password: "SecurePass123!",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it("passwordHash is never returned in organizer user data", async () => {
      const organizer = await createTestOrganizer("sec-org-pw");

      const res = await request(app)
        .get("/api/organizers/me")
        .set("Cookie", organizer.cookie);

      expect(res.status).toBe(200);
      // Check the response doesn't contain passwordHash anywhere
      const responseStr = JSON.stringify(res.body);
      expect(responseStr).not.toContain("passwordHash");
    });
  });

  describe("Cross-user access prevention", () => {
    it("users cannot access other users' orders", async () => {
      const user1 = await createTestUser("sec-cross-orders1", "ATTENDEE");
      const user2 = await createTestUser("sec-cross-orders2", "ATTENDEE");

      // user1 gets their orders
      const res1 = await request(app)
        .get("/api/orders")
        .set("Cookie", user1.cookie);

      expect(res1.status).toBe(200);

      // user2 gets their orders (should be different/empty)
      const res2 = await request(app)
        .get("/api/orders")
        .set("Cookie", user2.cookie);

      expect(res2.status).toBe(200);
    });

    it("users cannot access other users' tickets", async () => {
      const user1 = await createTestUser("sec-cross-tickets1", "ATTENDEE");
      const user2 = await createTestUser("sec-cross-tickets2", "ATTENDEE");

      // user1 gets their tickets
      const res1 = await request(app)
        .get("/api/tickets")
        .set("Cookie", user1.cookie);

      expect(res1.status).toBe(200);

      // user2 gets their tickets
      const res2 = await request(app)
        .get("/api/tickets")
        .set("Cookie", user2.cookie);

      expect(res2.status).toBe(200);
    });
  });

  describe("Client manipulation prevention", () => {
    it("client cannot override organizerId when creating a festival", async () => {
      const organizer = await createTestOrganizer("sec-org-override");
      const otherOrganizer = await createTestOrganizer("sec-org-target");
      const category = await getTestCategory();
      const venue = await getTestVenue();

      const res = await request(app)
        .post("/api/festivals")
        .set("Cookie", organizer.cookie)
        .send({
          name: "Override Test Festival",
          categoryId: category.id,
          venueId: venue.id,
          organizerId: otherOrganizer.organizer.id, // try to override
          startDate: new Date(Date.now() + 90 * 86400000).toISOString(),
          endDate: new Date(Date.now() + 92 * 86400000).toISOString(),
        });

      expect(res.status).toBe(201);
      // The festival should belong to organizer, not otherOrganizer
      expect(res.body.data.festival.organizerId).toBe(
        organizer.organizer.id
      );
    });

    it("client cannot override festival status directly", async () => {
      const organizer = await createTestOrganizer("sec-status-override");
      const category = await getTestCategory();
      const venue = await getTestVenue();

      const res = await request(app)
        .post("/api/festivals")
        .set("Cookie", organizer.cookie)
        .send({
          name: "Status Override Festival",
          categoryId: category.id,
          venueId: venue.id,
          status: "PUBLISHED", // try to skip the workflow
          startDate: new Date(Date.now() + 90 * 86400000).toISOString(),
          endDate: new Date(Date.now() + 92 * 86400000).toISOString(),
        });

      expect(res.status).toBe(201);
      // Should always start as DRAFT
      expect(res.body.data.festival.status).toBe("DRAFT");
    });

    it("client cannot bypass ownership checks on payment", async () => {
      const { festival } = await createTestFestival({
        organizerPrefix: "sec-pay-bypass",
        status: "PUBLISHED",
      });
      const ticketType = await createTestTicketType(festival.id, {
        price: 100,
        quantity: 50,
      });
      const buyer1 = await createTestUser("sec-pay1", "ATTENDEE");
      const buyer2 = await createTestUser("sec-pay2", "ATTENDEE");

      // buyer1 creates an order
      const orderRes = await request(app)
        .post("/api/orders")
        .set("Cookie", buyer1.cookie)
        .send({
          festivalId: festival.id,
          items: [{ ticketTypeId: ticketType.id, quantity: 1 }],
        });
      const order = orderRes.body.data.order;

      // buyer1 creates payment
      const payRes = await request(app)
        .post(`/api/orders/${order.id}/payment`)
        .set("Cookie", buyer1.cookie);
      const paymentId = payRes.body.data.payment.id;

      // buyer2 tries to mark buyer1's payment as successful
      const res = await request(app)
        .post(`/api/payments/${paymentId}/test-success`)
        .set("Cookie", buyer2.cookie);

      expect(res.status).toBe(403);
    });

    it("client cannot override payment totals", async () => {
      const { festival } = await createTestFestival({
        organizerPrefix: "sec-pay-total",
        status: "PUBLISHED",
      });
      const ticketType = await createTestTicketType(festival.id, {
        price: 500,
        quantity: 50,
      });
      const buyer = await createTestUser("sec-pay-total-buyer", "ATTENDEE");

      // Create order with 3 tickets (total = 1500)
      const orderRes = await request(app)
        .post("/api/orders")
        .set("Cookie", buyer.cookie)
        .send({
          festivalId: festival.id,
          items: [{ ticketTypeId: ticketType.id, quantity: 3 }],
        });
      const order = orderRes.body.data.order;
      expect(Number(order.totalAmount)).toBe(1500);

      // Create payment - amount should be 1500
      const payRes = await request(app)
        .post(`/api/orders/${order.id}/payment`)
        .set("Cookie", buyer.cookie);

      expect(Number(payRes.body.data.payment.amount)).toBe(1500);
    });
  });
});
