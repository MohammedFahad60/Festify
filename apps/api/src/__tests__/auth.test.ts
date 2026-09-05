import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import {
  createTestUser,
  createTestOrganizer,
  generateToken,
} from "./helpers/auth.js";
import { cleanupTestData, testPrisma } from "./helpers/db.js";

describe("Authentication", () => {
  afterAll(async () => {
    await cleanupTestData();
  });

  describe("POST /api/auth/register", () => {
    it("registers a new user successfully", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "New User",
          email: `test-register-${Date.now()}@test.local`,
          password: "StrongPass123!",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBeDefined();
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("rejects duplicate email", async () => {
      const userData = await createTestUser("dup-register");

      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Duplicate User",
          email: userData.user.email,
          password: "StrongPass123!",
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it("rejects invalid email format", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Bad Email",
          email: "not-an-email",
          password: "StrongPass123!",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("rejects short password", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Short Pass",
          email: `test-short-${Date.now()}@test.local`,
          password: "123",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/auth/login", () => {
    it("logs in with valid credentials", async () => {
      const userData = await createTestUser("login-valid");

      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: userData.user.email,
          password: userData.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(userData.user.email);
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it("rejects invalid credentials", async () => {
      const userData = await createTestUser("login-invalid");

      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: userData.user.email,
          password: "WrongPassword999!",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid/i);
    });

    it("rejects nonexistent email", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test-nonexistent@test.local",
          password: "SomePassword123!",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns current user when authenticated", async () => {
      const userData = await createTestUser("me-auth");

      const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", userData.cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.id).toBe(userData.user.id);
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it("returns 401 when unauthenticated", async () => {
      const res = await request(app).get("/api/auth/me");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("returns 401 with invalid token", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", "festify_token=invalid.token.here");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
