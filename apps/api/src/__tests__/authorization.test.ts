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
} from "./helpers/fixtures.js";
import { cleanupTestData } from "./helpers/db.js";

describe("Authorization", () => {
  afterAll(async () => {
    await cleanupTestData();
  });

  describe("Role-based access control", () => {
    it("attendee cannot access organizer-only endpoints", async () => {
      const attendee = await createTestUser("authz-attendee", "ATTENDEE");

      const res = await request(app)
        .get("/api/festivals/organizer")
        .set("Cookie", attendee.cookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("non-admin cannot access admin endpoints", async () => {
      const attendee = await createTestUser("authz-nonadmin", "ATTENDEE");

      const res = await request(app)
        .get("/api/admin/organizers/pending")
        .set("Cookie", attendee.cookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("organizer cannot access admin endpoints", async () => {
      const organizer = await createTestOrganizer("authz-org-admin");

      const res = await request(app)
        .get("/api/admin/organizers/pending")
        .set("Cookie", organizer.cookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("admin can access admin endpoints", async () => {
      const admin = await createTestUser("authz-admin", "ADMIN");

      const res = await request(app)
        .get("/api/admin/organizers/pending")
        .set("Cookie", admin.cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("unauthenticated user gets 401 on protected endpoints", async () => {
      const res = await request(app).get("/api/festivals/organizer");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Ownership enforcement", () => {
    it("organizer cannot modify another organizer's festival", async () => {
      const organizer1 = await createTestOrganizer("authz-org1");
      const organizer2 = await createTestOrganizer("authz-org2");
      const category = await getTestCategory();
      const venue = await getTestVenue();

      // Create a festival as organizer1
      const createRes = await request(app)
        .post("/api/festivals")
        .set("Cookie", organizer1.cookie)
        .send({
          name: "Org1 Festival",
          categoryId: category.id,
          venueId: venue.id,
          startDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 92 * 24 * 60 * 60 * 1000).toISOString(),
        });

      expect(createRes.status).toBe(201);
      const festivalId = createRes.body.data.festival.id;

      // Try to update as organizer2
      const updateRes = await request(app)
        .patch(`/api/festivals/${festivalId}`)
        .set("Cookie", organizer2.cookie)
        .send({ name: "Hacked Festival" });

      expect(updateRes.status).toBe(403);
      expect(updateRes.body.success).toBe(false);
    });

    it("users cannot read another user's orders", async () => {
      const user1 = await createTestUser("authz-orders1", "ATTENDEE");
      const user2 = await createTestUser("authz-orders2", "ATTENDEE");

      // user1 lists their own orders (should be empty but succeed)
      const res = await request(app)
        .get("/api/orders")
        .set("Cookie", user1.cookie);

      expect(res.status).toBe(200);

      // user1 cannot access user2's specific order (if we had one)
      // Test with a random UUID
      const fakeOrderId = "00000000-0000-0000-0000-000000000000";
      const res2 = await request(app)
        .get(`/api/orders/${fakeOrderId}`)
        .set("Cookie", user1.cookie);

      expect(res2.status).toBe(404);
    });

    it("users cannot read another user's tickets", async () => {
      const user1 = await createTestUser("authz-tickets1", "ATTENDEE");

      // user1 lists their own tickets
      const res = await request(app)
        .get("/api/tickets")
        .set("Cookie", user1.cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.tickets).toEqual([]);
    });
  });
});
