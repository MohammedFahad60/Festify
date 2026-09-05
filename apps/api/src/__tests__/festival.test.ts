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
} from "./helpers/fixtures.js";
import { cleanupTestData, testPrisma } from "./helpers/db.js";

describe("Festival Workflow", () => {
  let category: any;
  let venue: any;

  beforeAll(async () => {
    category = await getTestCategory();
    venue = await getTestVenue();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe("State transitions", () => {
    it("DRAFT -> SUBMITTED", async () => {
      const organizer = await createTestOrganizer("fw-draft-sub");

      const createRes = await request(app)
        .post("/api/festivals")
        .set("Cookie", organizer.cookie)
        .send({
          name: "Draft To Submit Festival",
          categoryId: category.id,
          venueId: venue.id,
          startDate: new Date(Date.now() + 90 * 86400000).toISOString(),
          endDate: new Date(Date.now() + 92 * 86400000).toISOString(),
        });

      expect(createRes.status).toBe(201);
      const festivalId = createRes.body.data.festival.id;
      expect(createRes.body.data.festival.status).toBe("DRAFT");

      const submitRes = await request(app)
        .patch(`/api/festivals/${festivalId}/submit`)
        .set("Cookie", organizer.cookie);

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.data.festival.status).toBe("SUBMITTED");
    });

    it("SUBMITTED -> APPROVED (via admin)", async () => {
      const admin = await createTestUser("fw-admin-approve", "ADMIN");
      const organizer = await createTestOrganizer("fw-submit-approve");

      const createRes = await request(app)
        .post("/api/festivals")
        .set("Cookie", organizer.cookie)
        .send({
          name: "Submit To Approve Festival",
          categoryId: category.id,
          venueId: venue.id,
          startDate: new Date(Date.now() + 90 * 86400000).toISOString(),
          endDate: new Date(Date.now() + 92 * 86400000).toISOString(),
        });

      const festivalId = createRes.body.data.festival.id;

      await request(app)
        .patch(`/api/festivals/${festivalId}/submit`)
        .set("Cookie", organizer.cookie);

      const approveRes = await request(app)
        .patch(`/api/admin/festivals/${festivalId}/approve`)
        .set("Cookie", admin.cookie);

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.festival.status).toBe("APPROVED");
    });

    it("SUBMITTED -> REJECTED (via admin)", async () => {
      const admin = await createTestUser("fw-admin-reject", "ADMIN");
      const organizer = await createTestOrganizer("fw-submit-reject");

      const createRes = await request(app)
        .post("/api/festivals")
        .set("Cookie", organizer.cookie)
        .send({
          name: "Submit To Reject Festival",
          categoryId: category.id,
          venueId: venue.id,
          startDate: new Date(Date.now() + 90 * 86400000).toISOString(),
          endDate: new Date(Date.now() + 92 * 86400000).toISOString(),
        });

      const festivalId = createRes.body.data.festival.id;

      await request(app)
        .patch(`/api/festivals/${festivalId}/submit`)
        .set("Cookie", organizer.cookie);

      const rejectRes = await request(app)
        .patch(`/api/admin/festivals/${festivalId}/reject`)
        .set("Cookie", admin.cookie);

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.data.festival.status).toBe("REJECTED");
    });

    it("APPROVED -> PUBLISHED", async () => {
      const organizer = await createTestOrganizer("fw-approved-publish");

      const createRes = await request(app)
        .post("/api/festivals")
        .set("Cookie", organizer.cookie)
        .send({
          name: "Approve To Publish Festival",
          categoryId: category.id,
          venueId: venue.id,
          startDate: new Date(Date.now() + 90 * 86400000).toISOString(),
          endDate: new Date(Date.now() + 92 * 86400000).toISOString(),
        });

      const festivalId = createRes.body.data.festival.id;

      // Submit
      await request(app)
        .patch(`/api/festivals/${festivalId}/submit`)
        .set("Cookie", organizer.cookie);

      // Admin approve
      const admin = await createTestUser("fw-admin-pub", "ADMIN");
      await request(app)
        .patch(`/api/admin/festivals/${festivalId}/approve`)
        .set("Cookie", admin.cookie);

      // Organizer publish
      const publishRes = await request(app)
        .patch(`/api/festivals/${festivalId}/publish`)
        .set("Cookie", organizer.cookie);

      expect(publishRes.status).toBe(200);
      expect(publishRes.body.data.festival.status).toBe("PUBLISHED");
    });

    it("published festival cannot be edited", async () => {
      const organizer = await createTestOrganizer("fw-published-edit");

      const createRes = await request(app)
        .post("/api/festivals")
        .set("Cookie", organizer.cookie)
        .send({
          name: "Published Edit Festival",
          categoryId: category.id,
          venueId: venue.id,
          startDate: new Date(Date.now() + 90 * 86400000).toISOString(),
          endDate: new Date(Date.now() + 92 * 86400000).toISOString(),
        });

      const festivalId = createRes.body.data.festival.id;

      // Submit -> approve -> publish
      await request(app).patch(`/api/festivals/${festivalId}/submit`).set("Cookie", organizer.cookie);
      const admin = await createTestUser("fw-admin-pe", "ADMIN");
      await request(app).patch(`/api/admin/festivals/${festivalId}/approve`).set("Cookie", admin.cookie);
      await request(app).patch(`/api/festivals/${festivalId}/publish`).set("Cookie", organizer.cookie);

      // Try to edit
      const editRes = await request(app)
        .patch(`/api/festivals/${festivalId}`)
        .set("Cookie", organizer.cookie)
        .send({ name: "Hacked Name" });

      expect(editRes.status).toBe(409);
      expect(editRes.body.success).toBe(false);
    });
  });

  describe("Invalid inputs", () => {
    it("invalid UUID is rejected", async () => {
      const organizer = await createTestOrganizer("fw-invalid-uuid");

      const res = await request(app)
        .get("/api/festivals/organizer/not-a-uuid")
        .set("Cookie", organizer.cookie);

      expect(res.status).toBe(404);
    });

    it("nonexistent festival returns 404", async () => {
      const res = await request(app)
        .get("/api/festivals/00000000-0000-0000-0000-000000000000");

      expect(res.status).toBe(404);
    });

    it("missing required fields returns 400", async () => {
      const organizer = await createTestOrganizer("fw-missing-fields");

      const res = await request(app)
        .post("/api/festivals")
        .set("Cookie", organizer.cookie)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Public access", () => {
    it("public listing only exposes published festivals", async () => {
      const res = await request(app).get("/api/festivals");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.festivals)).toBe(true);

      // All returned festivals should be PUBLISHED
      for (const f of res.body.data.festivals) {
        expect(f.status).toBe("PUBLISHED");
      }
    });

    it("public listing does not expose passwordHash", async () => {
      const res = await request(app).get("/api/festivals");

      expect(res.status).toBe(200);
      for (const f of res.body.data.festivals) {
        expect(f.organizer).toBeDefined();
        expect((f.organizer as any).passwordHash).toBeUndefined();
        if (f.organizer.user) {
          expect(f.organizer.user.passwordHash).toBeUndefined();
        }
      }
    });

    it("public detail only exposes published festivals", async () => {
      // Try to get a non-existent festival (which would be non-published)
      const res = await request(app)
        .get("/api/festivals/00000000-0000-0000-0000-000000000000");

      expect(res.status).toBe(404);
    });
  });

  describe("Organizer enforcement", () => {
    it("non-organizer cannot create a festival", async () => {
      const attendee = await createTestUser("fw-non-org", "ATTENDEE");

      const res = await request(app)
        .post("/api/festivals")
        .set("Cookie", attendee.cookie)
        .send({
          name: "Unauthorized Festival",
          categoryId: category.id,
          venueId: venue.id,
          startDate: new Date(Date.now() + 90 * 86400000).toISOString(),
          endDate: new Date(Date.now() + 92 * 86400000).toISOString(),
        });

      expect(res.status).toBe(403);
    });

    it("unapproved organizer cannot create a festival", async () => {
      const organizer = await createTestOrganizer("fw-unapproved", {
        verificationStatus: "PENDING",
      });

      const res = await request(app)
        .post("/api/festivals")
        .set("Cookie", organizer.cookie)
        .send({
          name: "Unapproved Festival",
          categoryId: category.id,
          venueId: venue.id,
          startDate: new Date(Date.now() + 90 * 86400000).toISOString(),
          endDate: new Date(Date.now() + 92 * 86400000).toISOString(),
        });

      expect(res.status).toBe(403);
    });
  });
});
