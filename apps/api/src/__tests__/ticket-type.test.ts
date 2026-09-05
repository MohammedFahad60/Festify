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

describe("Ticket Types", () => {
  let category: any;
  let venue: any;

  beforeAll(async () => {
    category = await getTestCategory();
    venue = await getTestVenue();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe("POST /api/festivals/:festivalId/ticket-types", () => {
    it("organizer can create ticket type for own festival", async () => {
      const { festival, organizer } = await createTestFestival({
        organizerPrefix: "tt-own-create",
      });

      const res = await request(app)
        .post(`/api/festivals/${festival.id}/ticket-types`)
        .set("Cookie", organizer.cookie)
        .send({
          name: "VIP Pass",
          price: 2500,
          quantity: 50,
          saleStart: new Date(Date.now() - 86400000).toISOString(),
          saleEnd: new Date(Date.now() + 90 * 86400000).toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ticketType.name).toBe("VIP Pass");
      expect(Number(res.body.data.ticketType.price)).toBe(2500);
    });

    it("non-organizer cannot create ticket type", async () => {
      const attendee = await createTestUser("tt-non-org", "ATTENDEE");
      const { festival } = await createTestFestival({
        organizerPrefix: "tt-non-org-fest",
      });

      const res = await request(app)
        .post(`/api/festivals/${festival.id}/ticket-types`)
        .set("Cookie", attendee.cookie)
        .send({
          name: "Regular Pass",
          price: 500,
          quantity: 100,
          saleStart: new Date(Date.now() - 86400000).toISOString(),
          saleEnd: new Date(Date.now() + 90 * 86400000).toISOString(),
        });

      expect(res.status).toBe(403);
    });

    it("organizer cannot create ticket types for another organizer's festival", async () => {
      const { festival } = await createTestFestival({
        organizerPrefix: "tt-other-fest",
      });
      const otherOrganizer = await createTestOrganizer("tt-other-org");

      const res = await request(app)
        .post(`/api/festivals/${festival.id}/ticket-types`)
        .set("Cookie", otherOrganizer.cookie)
        .send({
          name: "Stolen Pass",
          price: 100,
          quantity: 10,
          saleStart: new Date(Date.now() - 86400000).toISOString(),
          saleEnd: new Date(Date.now() + 90 * 86400000).toISOString(),
        });

      expect(res.status).toBe(403);
    });

    it("invalid price is rejected", async () => {
      const { festival, organizer } = await createTestFestival({
        organizerPrefix: "tt-invalid-price",
      });

      const res = await request(app)
        .post(`/api/festivals/${festival.id}/ticket-types`)
        .set("Cookie", organizer.cookie)
        .send({
          name: "Bad Price Pass",
          price: -100,
          quantity: 10,
          saleStart: new Date(Date.now() - 86400000).toISOString(),
          saleEnd: new Date(Date.now() + 90 * 86400000).toISOString(),
        });

      expect(res.status).toBe(400);
    });

    it("invalid quantity is rejected", async () => {
      const { festival, organizer } = await createTestFestival({
        organizerPrefix: "tt-invalid-qty",
      });

      const res = await request(app)
        .post(`/api/festivals/${festival.id}/ticket-types`)
        .set("Cookie", organizer.cookie)
        .send({
          name: "Bad Qty Pass",
          price: 500,
          quantity: -5,
          saleStart: new Date(Date.now() - 86400000).toISOString(),
          saleEnd: new Date(Date.now() + 90 * 86400000).toISOString(),
        });

      expect(res.status).toBe(400);
    });

    it("invalid sale period is rejected", async () => {
      const { festival, organizer } = await createTestFestival({
        organizerPrefix: "tt-invalid-sale",
      });

      const res = await request(app)
        .post(`/api/festivals/${festival.id}/ticket-types`)
        .set("Cookie", organizer.cookie)
        .send({
          name: "Bad Sale Pass",
          price: 500,
          quantity: 10,
          saleStart: new Date(Date.now() + 90 * 86400000).toISOString(),
          saleEnd: new Date(Date.now() - 86400000).toISOString(),
        });

      expect(res.status).toBe(400);
    });

    it("nonexistent festival returns 404", async () => {
      const organizer = await createTestOrganizer("tt-no-fest");

      const res = await request(app)
        .post(
          "/api/festivals/00000000-0000-0000-0000-000000000000/ticket-types"
        )
        .set("Cookie", organizer.cookie)
        .send({
          name: "Ghost Pass",
          price: 500,
          quantity: 10,
          saleStart: new Date(Date.now() - 86400000).toISOString(),
          saleEnd: new Date(Date.now() + 90 * 86400000).toISOString(),
        });

      expect(res.status).toBe(404);
    });

    it("maxPerUser validation works", async () => {
      const { festival, organizer } = await createTestFestival({
        organizerPrefix: "tt-max-per-user",
      });

      const res = await request(app)
        .post(`/api/festivals/${festival.id}/ticket-types`)
        .set("Cookie", organizer.cookie)
        .send({
          name: "Limited Pass",
          price: 500,
          quantity: 100,
          maxPerUser: 3,
          saleStart: new Date(Date.now() - 86400000).toISOString(),
          saleEnd: new Date(Date.now() + 90 * 86400000).toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.data.ticketType.maxPerUser).toBe(3);
    });
  });
});
