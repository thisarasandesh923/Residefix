// End-to-end API tests against a real MongoDB.
// Uses TEST_MONGO_URI (default: a throwaway "residefix_test" database on localhost).
// Start one with:  docker compose -f compose.dev.yaml up -d mongo
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import process from "node:process";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../src/app.js";
import { connectDatabase } from "../src/config/db.js";
import { loadConfig } from "../src/config/env.js";

const TEST_URI = process.env.TEST_MONGO_URI || "mongodb://127.0.0.1:27017/residefix_test";

if (!/test/i.test(new URL(TEST_URI.replace(/^mongodb(\+srv)?:/, "http:")).pathname)) {
  throw new Error("Refusing to run: TEST_MONGO_URI database name must contain 'test'");
}

let app;
let reachable = true;

before(async () => {
  const config = loadConfig({ MONGO_URI: TEST_URI, JWT_SECRET: "t".repeat(48), AUTH_RATE_LIMIT: "1000" });
  try {
    await connectDatabase(TEST_URI, { attempts: 1 });
  } catch {
    reachable = false;
    return;
  }
  await mongoose.connection.dropDatabase();
  app = createApp(config);
});

after(async () => {
  if (reachable) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const signupAndLogin = async (overrides) => {
  const user = { name: "Test User", password: "password123", ...overrides };
  await request(app).post("/api/auth/signup").send(user).expect(201);
  const res = await request(app).post("/api/auth/login").send({ email: user.email, password: user.password }).expect(200);
  return res.body.token;
};

describe("ResideFix API", () => {
  test("health endpoints report status", async (t) => {
    if (!reachable) return t.skip(`MongoDB not reachable at ${TEST_URI}`);
    await request(app).get("/api/health").expect(200);
    const ready = await request(app).get("/api/health/ready").expect(200);
    assert.equal(ready.body.database, "up");
  });

  test("full resident and manager workflow", async (t) => {
    if (!reachable) return t.skip(`MongoDB not reachable at ${TEST_URI}`);

    const resident = await signupAndLogin({ email: "res@test.local", property: "Green Hostel" });
    const other = await signupAndLogin({ email: "other@test.local" });
    const manager = await signupAndLogin({ email: "mgr@test.local", role: "manager" });

    // Duplicate signup is rejected and the password hash is never returned
    const dup = await request(app)
      .post("/api/auth/signup")
      .send({ name: "Xavier", email: "RES@test.local", password: "password123" })
      .expect(409);
    assert.match(dup.body.message, /already exists/);

    await request(app).post("/api/auth/login").send({ email: "res@test.local", password: "wrong-pass" }).expect(401);
    await request(app).get("/api/complaints").expect(401);

    const created = await request(app)
      .post("/api/complaints")
      .set("Authorization", `Bearer ${resident}`)
      .send({ title: "Leaking tap", description: "Bathroom tap drips", property: "Green Hostel", category: "plumbing", priority: "high" })
      .expect(201);
    const id = created.body._id;
    assert.equal(created.body.status, "open");
    assert.equal(created.body.createdBy.password, undefined);

    // Another resident cannot see it; the manager can
    await request(app).get(`/api/complaints/${id}`).set("Authorization", `Bearer ${other}`).expect(404);
    const all = await request(app).get("/api/complaints").set("Authorization", `Bearer ${manager}`).expect(200);
    assert.equal(all.body.length, 1);

    // Residents cannot change status; managers can, and resolvedAt is recorded
    await request(app).patch(`/api/complaints/${id}`).set("Authorization", `Bearer ${resident}`).send({ status: "resolved" }).expect(403);
    const resolved = await request(app)
      .patch(`/api/complaints/${id}`)
      .set("Authorization", `Bearer ${manager}`)
      .send({ status: "resolved" })
      .expect(200);
    assert.ok(resolved.body.resolvedAt);

    // Resolved complaints cannot be edited or withdrawn by the resident
    await request(app).patch(`/api/complaints/${id}`).set("Authorization", `Bearer ${resident}`).send({ title: "New title" }).expect(409);
    await request(app).delete(`/api/complaints/${id}`).set("Authorization", `Bearer ${resident}`).expect(409);

    // Stats are manager-only
    await request(app).get("/api/complaints/stats").set("Authorization", `Bearer ${resident}`).expect(403);
    const stats = await request(app).get("/api/complaints/stats").set("Authorization", `Bearer ${manager}`).expect(200);
    assert.equal(stats.body.total, 1);
    assert.equal(stats.body.byStatus.resolved, 1);
    assert.equal(stats.body.trend.length, 14);

    await request(app).delete(`/api/complaints/${id}`).set("Authorization", `Bearer ${manager}`).expect(200);
  });

  test("bad input returns 4xx, not 500", async (t) => {
    if (!reachable) return t.skip(`MongoDB not reachable at ${TEST_URI}`);
    await request(app).post("/api/auth/login").send({ email: { $gt: "" }, password: "x" }).expect(400);
    await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{bad json").expect(400);
    await request(app).get("/api/does-not-exist").expect(404);
  });
});
