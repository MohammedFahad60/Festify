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

describe("Payments", () => {
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
   * Helper: create a PUBLISHED festival with ticket types, create an order,
   * and return all the IDs needed for payment tests.
   */
  async function createOrderForPayment(prefix: string, ticketOpts?: any) {
    const { festival } = await createTestFestival({
      organizerPrefix: `pay-${prefix}`,
      status: "PUBLISHED",
    });
    const ticketType = await createTestTicketType(festival.id, {
      price: 500,
      quantity: 50,
      ...ticketOpts,
    });
    const buyer = await createTestUser(`pay-buyer-${prefix}`, "ATTENDEE");

    const orderRes = await request(app)
      .post("/api/orders")
      .set("Cookie", buyer.cookie)
      .send({
        festivalId: festival.id,
        items: [{ ticketTypeId: ticketType.id, quantity: 2 }],
      });

    expect(orderRes.status).toBe(201);
    const order = orderRes.body.data.order;

    return { festival, ticketType, buyer, order };
  }

  describe("Payment initialization", () => {
    it("unauthenticated payment initialization is rejected", async () => {
      const res = await request(app)
        .post("/api/orders/00000000-0000-0000-0000-000000000000/payment")
        .send({});

      expect(res.status).toBe(401);
    });

    it("payment amount comes from server-side order", async () => {
      const { buyer, order } = await createOrderForPayment("pay-amount");

      const res = await request(app)
        .post(`/api/orders/${order.id}/payment`)
        .set("Cookie", buyer.cookie);

      expect(res.status).toBe(201);
      expect(res.body.data.payment).toBeDefined();
      // Amount should match the order total, not anything the client sends
      expect(Number(res.body.data.payment.amount)).toBe(
        Number(order.totalAmount)
      );
    });

    it("client cannot supply a different payment amount", async () => {
      const { buyer, order } = await createOrderForPayment("pay-manip");

      // Even if we send a body with a different amount, server ignores it
      const res = await request(app)
        .post(`/api/orders/${order.id}/payment`)
        .set("Cookie", buyer.cookie)
        .send({ amount: 1 }); // try to underpay

      expect(res.status).toBe(201);
      expect(Number(res.body.data.payment.amount)).toBe(
        Number(order.totalAmount)
      );
    });
  });

  describe("Payment success flow", () => {
    it("successful test payment confirms the order", async () => {
      const { buyer, order } = await createOrderForPayment("pay-success");

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
      expect(successRes.body.data.payment.status).toBe("SUCCESS");

      // Verify order is confirmed
      const orderRes = await request(app)
        .get(`/api/orders/${order.id}`)
        .set("Cookie", buyer.cookie);

      expect(orderRes.status).toBe(200);
      expect(orderRes.body.data.order.status).toBe("CONFIRMED");
    });

    it("successful payment is idempotent", async () => {
      const { buyer, order } = await createOrderForPayment("pay-idempotent");

      const payRes = await request(app)
        .post(`/api/orders/${order.id}/payment`)
        .set("Cookie", buyer.cookie);

      const paymentId = payRes.body.data.payment.id;

      // First success
      const res1 = await request(app)
        .post(`/api/payments/${paymentId}/test-success`)
        .set("Cookie", buyer.cookie);

      expect(res1.status).toBe(200);

      // Second success (idempotent)
      const res2 = await request(app)
        .post(`/api/payments/${paymentId}/test-success`)
        .set("Cookie", buyer.cookie);

      expect(res2.status).toBe(200);
      expect(res2.body.data.payment.status).toBe("SUCCESS");
    });

    it("repeated payment success does not duplicate tickets", async () => {
      const { buyer, order } = await createOrderForPayment("pay-no-dup");

      const payRes = await request(app)
        .post(`/api/orders/${order.id}/payment`)
        .set("Cookie", buyer.cookie);

      const paymentId = payRes.body.data.payment.id;

      // First success
      await request(app)
        .post(`/api/payments/${paymentId}/test-success`)
        .set("Cookie", buyer.cookie);

      const ticketsAfterFirst = await testPrisma.ticket.findMany({
        where: { orderId: order.id },
      });

      // Second success
      await request(app)
        .post(`/api/payments/${paymentId}/test-success`)
        .set("Cookie", buyer.cookie);

      const ticketsAfterSecond = await testPrisma.ticket.findMany({
        where: { orderId: order.id },
      });

      expect(ticketsAfterSecond.length).toBe(ticketsAfterFirst.length);
    });
  });

  describe("Payment failure", () => {
    it("failed payment transitions correctly", async () => {
      const { buyer, order } = await createOrderForPayment("pay-fail");

      const payRes = await request(app)
        .post(`/api/orders/${order.id}/payment`)
        .set("Cookie", buyer.cookie);

      const paymentId = payRes.body.data.payment.id;

      const failRes = await request(app)
        .post(`/api/payments/${paymentId}/test-fail`)
        .set("Cookie", buyer.cookie);

      expect(failRes.status).toBe(200);
      expect(failRes.body.data.payment.status).toBe("FAILED");

      // Order should remain PENDING
      const orderRes = await request(app)
        .get(`/api/orders/${order.id}`)
        .set("Cookie", buyer.cookie);

      expect(orderRes.body.data.order.status).toBe("PENDING");
    });

    it("terminal payment cannot transition again", async () => {
      const { buyer, order } = await createOrderForPayment("pay-terminal");

      const payRes = await request(app)
        .post(`/api/orders/${order.id}/payment`)
        .set("Cookie", buyer.cookie);

      const paymentId = payRes.body.data.payment.id;

      // Mark as failed
      await request(app)
        .post(`/api/payments/${paymentId}/test-fail`)
        .set("Cookie", buyer.cookie);

      // Try to mark as success (should fail)
      const res = await request(app)
        .post(`/api/payments/${paymentId}/test-success`)
        .set("Cookie", buyer.cookie);

      expect(res.status).toBe(409);
    });

    it("confirmed order cannot be confirmed again", async () => {
      const { buyer, order } = await createOrderForPayment("pay-reconfirm");

      const payRes = await request(app)
        .post(`/api/orders/${order.id}/payment`)
        .set("Cookie", buyer.cookie);

      const paymentId = payRes.body.data.payment.id;

      // Complete payment
      await request(app)
        .post(`/api/payments/${paymentId}/test-success`)
        .set("Cookie", buyer.cookie);

      // Try to confirm again
      const res = await request(app)
        .post(`/api/orders/${order.id}/confirm`)
        .set("Cookie", buyer.cookie);

      expect(res.status).toBe(200); // idempotent, returns the confirmed order
      expect(res.body.data.order.status).toBe("CONFIRMED");
    });
  });

  describe("Payment access control", () => {
    it("unauthorized users cannot access another user's payment", async () => {
      const { buyer, order } = await createOrderForPayment("pay-access");

      const payRes = await request(app)
        .post(`/api/orders/${order.id}/payment`)
        .set("Cookie", buyer.cookie);

      const otherUser = await createTestUser("pay-other-user", "ATTENDEE");

      const res = await request(app)
        .get(`/api/orders/${order.id}/payment`)
        .set("Cookie", otherUser.cookie);

      expect(res.status).toBe(403);
    });
  });
});
