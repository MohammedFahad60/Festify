
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { createTestUser, createTestOrganizer } from "./helpers/auth.js";
import { getTestCategory, getTestVenue } from "./helpers/fixtures.js";
import { cleanupTestData, testPrisma } from "./helpers/db.js";

describe("Festival Images API", () => {
  let category: any;
  let venue: any;

  beforeAll(async () => {
    category = await getTestCategory();
    venue = await getTestVenue();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  async function createDraftFestival(organizerCookie: string, name: string) {
    const res = await request(app)
      .post("/api/festivals")
      .set("Cookie", organizerCookie)
      .send({
        name,
        categoryId: category.id,
        venueId: venue.id,
        startDate: new Date(Date.now() + 90 * 86400000).toISOString(),
        endDate: new Date(Date.now() + 92 * 86400000).toISOString(),
      });
    return res.body.data.festival.id;
  }

  async function publishFestival(organizerCookie: string, festivalId: string) {
    await request(app).patch(`/api/festivals/${festivalId}/submit`).set("Cookie", organizerCookie);
    const admin = await createTestUser("admin-" + Math.random(), "ADMIN");
    await request(app).patch(`/api/admin/festivals/${festivalId}/approve`).set("Cookie", admin.cookie);
    await request(app).patch(`/api/festivals/${festivalId}/publish`).set("Cookie", organizerCookie);
  }

  it("authenticated organizer creates image", async () => {
    const org = await createTestOrganizer("img-org-1");
    const festId = await createDraftFestival(org.cookie, "Image Fest 1");
    
    const res = await request(app)
      .post(`/api/festivals/${festId}/images`)
      .set("Cookie", org.cookie)
      .send({
        imageUrl: "https://example.com/image1.jpg",
        altText: "Test image",
        sortOrder: 1,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.image.imageUrl).toBe("https://example.com/image1.jpg");
    expect(res.body.data.image.altText).toBe("Test image");
    expect(res.body.data.image.sortOrder).toBe(1);
  });

  it("unauthenticated create rejected", async () => {
    const org = await createTestOrganizer("img-org-2");
    const festId = await createDraftFestival(org.cookie, "Image Fest 2");
    
    const res = await request(app)
      .post(`/api/festivals/${festId}/images`)
      .send({
        imageUrl: "https://example.com/image2.jpg",
      });

    expect(res.status).toBe(401);
  });

  it("non-organizer create rejected", async () => {
    const org = await createTestOrganizer("img-org-3");
    const festId = await createDraftFestival(org.cookie, "Image Fest 3");
    
    const attendee = await createTestUser("img-att-1", "ATTENDEE");
    const res = await request(app)
      .post(`/api/festivals/${festId}/images`)
      .set("Cookie", attendee.cookie)
      .send({
        imageUrl: "https://example.com/image3.jpg",
      });

    expect(res.status).toBe(403);
  });

  it("wrong organizer rejected", async () => {
    const org = await createTestOrganizer("img-org-4");
    const festId = await createDraftFestival(org.cookie, "Image Fest 4");
    
    const wrongOrg = await createTestOrganizer("img-org-5");
    const res = await request(app)
      .post(`/api/festivals/${festId}/images`)
      .set("Cookie", wrongOrg.cookie)
      .send({
        imageUrl: "https://example.com/image4.jpg",
      });

    expect(res.status).toBe(403);
  });

  it("invalid URL rejected", async () => {
    const org = await createTestOrganizer("img-org-6");
    const festId = await createDraftFestival(org.cookie, "Image Fest 6");
    
    const res = await request(app)
      .post(`/api/festivals/${festId}/images`)
      .set("Cookie", org.cookie)
      .send({
        imageUrl: "not-a-url",
      });

    expect(res.status).toBe(400);
  });

  it("invalid sortOrder rejected", async () => {
    const org = await createTestOrganizer("img-org-7");
    const festId = await createDraftFestival(org.cookie, "Image Fest 7");
    
    const res = await request(app)
      .post(`/api/festivals/${festId}/images`)
      .set("Cookie", org.cookie)
      .send({
        imageUrl: "https://example.com/image.jpg",
        sortOrder: -1,
      });

    expect(res.status).toBe(400);
  });

  it("organizer lists own images", async () => {
    const org = await createTestOrganizer("img-org-8");
    const festId = await createDraftFestival(org.cookie, "Image Fest 8");
    
    await request(app).post(`/api/festivals/${festId}/images`).set("Cookie", org.cookie).send({ imageUrl: "https://example.com/1.jpg", sortOrder: 2 });
    await request(app).post(`/api/festivals/${festId}/images`).set("Cookie", org.cookie).send({ imageUrl: "https://example.com/2.jpg", sortOrder: 1 });

    const res = await request(app).get(`/api/festivals/${festId}/images`).set("Cookie", org.cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.images.length).toBe(2);
    expect(res.body.data.images[0].sortOrder).toBe(1);
    expect(res.body.data.images[1].sortOrder).toBe(2);
  });

  it("public published festival image list works", async () => {
    const org = await createTestOrganizer("img-org-9");
    const festId = await createDraftFestival(org.cookie, "Image Fest 9");
    await request(app).post(`/api/festivals/${festId}/images`).set("Cookie", org.cookie).send({ imageUrl: "https://example.com/pub.jpg" });
    
    await publishFestival(org.cookie, festId);

    const res = await request(app).get(`/api/festivals/${festId}/images`);
    expect(res.status).toBe(200);
    expect(res.body.data.images.length).toBe(1);
  });

  it("unpublished festival is not publicly exposed", async () => {
    const org = await createTestOrganizer("img-org-10");
    const festId = await createDraftFestival(org.cookie, "Image Fest 10");
    await request(app).post(`/api/festivals/${festId}/images`).set("Cookie", org.cookie).send({ imageUrl: "https://example.com/unpub.jpg" });

    const res = await request(app).get(`/api/festivals/${festId}/images`);
    expect(res.status).toBe(404);
  });

  it("organizer updates altText and sortOrder", async () => {
    const org = await createTestOrganizer("img-org-11");
    const festId = await createDraftFestival(org.cookie, "Image Fest 11");
    
    const postRes = await request(app).post(`/api/festivals/${festId}/images`).set("Cookie", org.cookie).send({ imageUrl: "https://example.com/update.jpg" });
    const imgId = postRes.body.data.image.id;

    const res = await request(app)
      .patch(`/api/festivals/${festId}/images/${imgId}`)
      .set("Cookie", org.cookie)
      .send({ altText: "New alt", sortOrder: 99 });

    expect(res.status).toBe(200);
    expect(res.body.data.image.altText).toBe("New alt");
    expect(res.body.data.image.sortOrder).toBe(99);
  });

  it("wrong organizer cannot update", async () => {
    const org = await createTestOrganizer("img-org-12");
    const festId = await createDraftFestival(org.cookie, "Image Fest 12");
    const postRes = await request(app).post(`/api/festivals/${festId}/images`).set("Cookie", org.cookie).send({ imageUrl: "https://example.com/update.jpg" });
    const imgId = postRes.body.data.image.id;

    const wrongOrg = await createTestOrganizer("img-org-13");
    const res = await request(app)
      .patch(`/api/festivals/${festId}/images/${imgId}`)
      .set("Cookie", wrongOrg.cookie)
      .send({ altText: "hacked" });

    expect(res.status).toBe(403);
  });

  it("organizer deletes image", async () => {
    const org = await createTestOrganizer("img-org-14");
    const festId = await createDraftFestival(org.cookie, "Image Fest 14");
    const postRes = await request(app).post(`/api/festivals/${festId}/images`).set("Cookie", org.cookie).send({ imageUrl: "https://example.com/del.jpg" });
    const imgId = postRes.body.data.image.id;

    const res = await request(app)
      .delete(`/api/festivals/${festId}/images/${imgId}`)
      .set("Cookie", org.cookie);

    expect(res.status).toBe(200);

    const getRes = await request(app).get(`/api/festivals/${festId}/images`).set("Cookie", org.cookie);
    expect(getRes.body.data.images.length).toBe(0);
  });

  it("wrong organizer cannot delete", async () => {
    const org = await createTestOrganizer("img-org-15");
    const festId = await createDraftFestival(org.cookie, "Image Fest 15");
    const postRes = await request(app).post(`/api/festivals/${festId}/images`).set("Cookie", org.cookie).send({ imageUrl: "https://example.com/del2.jpg" });
    const imgId = postRes.body.data.image.id;

    const wrongOrg = await createTestOrganizer("img-org-16");
    const res = await request(app)
      .delete(`/api/festivals/${festId}/images/${imgId}`)
      .set("Cookie", wrongOrg.cookie);

    expect(res.status).toBe(403);
  });

  it("nonexistent image returns expected error", async () => {
    const org = await createTestOrganizer("img-org-17");
    const festId = await createDraftFestival(org.cookie, "Image Fest 17");

    const res = await request(app)
      .patch(`/api/festivals/${festId}/images/00000000-0000-0000-0000-000000000000`)
      .set("Cookie", org.cookie)
      .send({ altText: "not found" });

    expect(res.status).toBe(404);
  });

  it("image from another festival cannot be modified", async () => {
    const org = await createTestOrganizer("img-org-18");
    const festId1 = await createDraftFestival(org.cookie, "Image Fest 18 A");
    const festId2 = await createDraftFestival(org.cookie, "Image Fest 18 B");
    
    const postRes = await request(app).post(`/api/festivals/${festId1}/images`).set("Cookie", org.cookie).send({ imageUrl: "https://example.com/1.jpg" });
    const imgId = postRes.body.data.image.id;

    const res = await request(app)
      .patch(`/api/festivals/${festId2}/images/${imgId}`)
      .set("Cookie", org.cookie)
      .send({ altText: "hacked" });

    expect(res.status).toBe(404);
  });

  it("immutable festival modification is rejected where applicable", async () => {
    const org = await createTestOrganizer("img-org-19");
    const festId = await createDraftFestival(org.cookie, "Image Fest 19");
    await publishFestival(org.cookie, festId);

    const res = await request(app)
      .post(`/api/festivals/${festId}/images`)
      .set("Cookie", org.cookie)
      .send({ imageUrl: "https://example.com/late.jpg" });

    expect(res.status).toBe(409);
  });
});
