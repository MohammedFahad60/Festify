import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { createTestUser, createTestOrganizer } from "./helpers/auth.js";
import { getTestCategory, getTestVenue, createTestFestival, createTestTicketType } from "./helpers/fixtures.js";
import { cleanupTestData, testPrisma } from "./helpers/db.js";

/**
 * Additional Phase 3 coverage — sale window, ended festival, invalid quantity,
 * cross-festival ticketType, duplicate payment init, payment amount ignored,
 * and explicit IDOR checks.
 */
describe("Phase 3 Additions", () => {
  let category: any;
  let venue: any;

  beforeAll(async () => {
    category = await getTestCategory();
    venue = await getTestVenue();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("sale window not yet started is rejected", async () => {
    const { festival } = await createTestFestival({ organizerPrefix: "add-sale-future", status: "PUBLISHED" });
    const ticketType = await createTestTicketType(festival.id, {
      saleStartOffset: 24 * 60 * 60 * 1000, // starts tomorrow
      saleEndOffset: 90 * 24 * 60 * 60 * 1000,
    });
    const buyer = await createTestUser("add-sale-future-buyer", "ATTENDEE");
    const res = await request(app).post("/api/orders").set("Cookie", buyer.cookie).send({
      festivalId: festival.id,
      items: [{ ticketTypeId: ticketType.id, quantity: 1 }],
    });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/sales are not currently active/i);
  });

  it("sale window already ended is rejected", async () => {
    const { festival } = await createTestFestival({ organizerPrefix: "add-sale-past", status: "PUBLISHED" });
    const ticketType = await createTestTicketType(festival.id, {
      saleStartOffset: -90 * 24 * 60 * 60 * 1000,
      saleEndOffset: -24 * 60 * 60 * 1000, // ended yesterday
    });
    const buyer = await createTestUser("add-sale-past-buyer", "ATTENDEE");
    const res = await request(app).post("/api/orders").set("Cookie", buyer.cookie).send({
      festivalId: festival.id,
      items: [{ ticketTypeId: ticketType.id, quantity: 1 }],
    });
    expect(res.status).toBe(409);
  });

  it("ended festival cannot be purchased", async () => {
    const { festival } = await createTestFestival({
      organizerPrefix: "add-ended",
      status: "PUBLISHED",
      startOffset: -10 * 24 * 60 * 60 * 1000,
      endOffset: -1 * 24 * 60 * 60 * 1000, // ended yesterday
    });
    const ticketType = await createTestTicketType(festival.id);
    const buyer = await createTestUser("add-ended-buyer", "ATTENDEE");
    const res = await request(app).post("/api/orders").set("Cookie", buyer.cookie).send({
      festivalId: festival.id,
      items: [{ ticketTypeId: ticketType.id, quantity: 1 }],
    });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/ended/i);
  });

  it("invalid quantity 0 is rejected by validation", async () => {
    const { festival } = await createTestFestival({ organizerPrefix: "add-qty-zero", status: "PUBLISHED" });
    const ticketType = await createTestTicketType(festival.id);
    const buyer = await createTestUser("add-qty-zero-buyer", "ATTENDEE");
    const res = await request(app).post("/api/orders").set("Cookie", buyer.cookie).send({
      festivalId: festival.id,
      items: [{ ticketTypeId: ticketType.id, quantity: 0 }],
    });
    expect(res.status).toBe(400);
  });

  it("invalid quantity negative is rejected", async () => {
    const { festival } = await createTestFestival({ organizerPrefix: "add-qty-neg", status: "PUBLISHED" });
    const ticketType = await createTestTicketType(festival.id);
    const buyer = await createTestUser("add-qty-neg-buyer", "ATTENDEE");
    const res = await request(app).post("/api/orders").set("Cookie", buyer.cookie).send({
      festivalId: festival.id,
      items: [{ ticketTypeId: ticketType.id, quantity: -5 }],
    });
    expect(res.status).toBe(400);
  });

  it("ticketType belonging to another festival is rejected", async () => {
    const { festival: festivalA } = await createTestFestival({ organizerPrefix: "add-cross-a", status: "PUBLISHED" });
    const { festival: festivalB } = await createTestFestival({ organizerPrefix: "add-cross-b", status: "PUBLISHED" });
    const ticketTypeA = await createTestTicketType(festivalA.id);
    const buyer = await createTestUser("add-cross-buyer", "ATTENDEE");
    const res = await request(app).post("/api/orders").set("Cookie", buyer.cookie).send({
      festivalId: festivalB.id,
      items: [{ ticketTypeId: ticketTypeA.id, quantity: 1 }],
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/does not belong/i);
  });

  it("duplicate payment initialization is idempotent and returns same payment", async () => {
    const { festival } = await createTestFestival({ organizerPrefix: "add-dup-pay", status: "PUBLISHED" });
    const ticketType = await createTestTicketType(festival.id, { price: 400, quantity: 50 });
    const buyer = await createTestUser("add-dup-pay-buyer", "ATTENDEE");
    const orderRes = await request(app).post("/api/orders").set("Cookie", buyer.cookie).send({
      festivalId: festival.id,
      items: [{ ticketTypeId: ticketType.id, quantity: 1 }],
    });
    expect(orderRes.status).toBe(201);
    const orderId = orderRes.body.data.order.id;
    const pay1 = await request(app).post(`/api/orders/${orderId}/payment`).set("Cookie", buyer.cookie);
    expect(pay1.status).toBe(201);
    const pay2 = await request(app).post(`/api/orders/${orderId}/payment`).set("Cookie", buyer.cookie);
    expect(pay2.status).toBe(201);
    expect(pay2.body.data.payment.id).toBe(pay1.body.data.payment.id);
    // ensure only one payment row for this order
    const payments = await testPrisma.payment.findMany({ where: { orderId } });
    expect(payments.length).toBe(1);
  });

  it("client-supplied amount on payment init is ignored (server amount authoritative)", async () => {
    const { festival } = await createTestFestival({ organizerPrefix: "add-pay-amt-ignore", status: "PUBLISHED" });
    const ticketType = await createTestTicketType(festival.id, { price: 600, quantity: 20 });
    const buyer = await createTestUser("add-pay-amt-buyer", "ATTENDEE");
    const orderRes = await request(app).post("/api/orders").set("Cookie", buyer.cookie).send({
      festivalId: festival.id,
      items: [{ ticketTypeId: ticketType.id, quantity: 2 }],
    });
    const orderId = orderRes.body.data.order.id;
    const orderTotal = Number(orderRes.body.data.order.totalAmount);
    expect(orderTotal).toBe(1200);
    const payRes = await request(app).post(`/api/orders/${orderId}/payment`).set("Cookie", buyer.cookie).send({ amount: 1, totalAmount: 1, price: 1 } as any);
    expect(payRes.status).toBe(201);
    expect(Number(payRes.body.data.payment.amount)).toBe(orderTotal);
  });

  it("concurrent duplicate payment init does not create two payments", async () => {
    const { festival } = await createTestFestival({ organizerPrefix: "add-conc-pay", status: "PUBLISHED" });
    const ticketType = await createTestTicketType(festival.id, { price: 300, quantity: 20 });
    const buyer = await createTestUser("add-conc-pay-buyer", "ATTENDEE");
    const orderRes = await request(app).post("/api/orders").set("Cookie", buyer.cookie).send({
      festivalId: festival.id,
      items: [{ ticketTypeId: ticketType.id, quantity: 1 }],
    });
    const orderId = orderRes.body.data.order.id;
    const results = await Promise.all([
      request(app).post(`/api/orders/${orderId}/payment`).set("Cookie", buyer.cookie),
      request(app).post(`/api/orders/${orderId}/payment`).set("Cookie", buyer.cookie),
    ]);
    // At least one must be 201; the other may be 201 (idempotent) or 409 (retry). In either case, only one row exists.
    expect(results.every(r => [201, 409].includes(r.status))).toBe(true);
    const payments = await testPrisma.payment.findMany({ where: { orderId } });
    expect(payments.length).toBe(1);
  });

  it("order id must be valid UUID otherwise 400", async () => {
    const buyer = await createTestUser("add-bad-uuid", "ATTENDEE");
    const res = await request(app).get("/api/orders/not-a-uuid").set("Cookie", buyer.cookie);
    expect(res.status).toBe(400);
  });

  it("ticket read id must be valid UUID otherwise 400", async () => {
    const buyer = await createTestUser("add-ticket-bad-uuid", "ATTENDEE");
    const res = await request(app).get("/api/tickets/not-a-uuid").set("Cookie", buyer.cookie);
    expect(res.status).toBe(400);
  });

  it("cross-organizer check-in is rejected", async () => {
    const { festival } = await createTestFestival({ organizerPrefix: "add-cross-checkin", status: "PUBLISHED" });
    const ticketType = await createTestTicketType(festival.id, { price: 200, quantity: 10 });
    const buyer = await createTestUser("add-cross-checkin-buyer", "ATTENDEE");
    const orderRes = await request(app).post("/api/orders").set("Cookie", buyer.cookie).send({
      festivalId: festival.id,
      items: [{ ticketTypeId: ticketType.id, quantity: 1 }],
    });
    const orderId = orderRes.body.data.order.id;
    const payRes = await request(app).post(`/api/orders/${orderId}/payment`).set("Cookie", buyer.cookie);
    const paymentId = payRes.body.data.payment.id;
    await request(app).post(`/api/payments/${paymentId}/test-success`).set("Cookie", buyer.cookie);
    const tickets = await request(app).get("/api/tickets").set("Cookie", buyer.cookie);
    const ticketCode = tickets.body.data.tickets[0].ticketCode;
    const otherOrganizer = await createTestOrganizer("add-cross-checkin-other");
    const res = await request(app).post(`/api/tickets/${ticketCode}/check-in`).set("Cookie", otherOrganizer.cookie);
    expect(res.status).toBe(403);
  });
});
