import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseComplaintFilters,
  validateComplaintUpdate,
  validateLogin,
  validateNewComplaint,
  validateSignup,
} from "../src/validators/index.js";

test("signup normalises email and defaults the role", () => {
  const { data } = validateSignup({ name: " Ann ", email: "ANN@Example.com", password: "password1" });
  assert.deepEqual(data, { name: "Ann", email: "ann@example.com", password: "password1", role: "resident", property: "" });
});

test("signup rejects weak passwords, bad emails and unknown roles", () => {
  assert.match(validateSignup({ name: "Ann", email: "a@b.co", password: "123" }).error, /at least 8/);
  assert.match(validateSignup({ name: "Ann", email: "nope", password: "password1" }).error, /valid email/);
  assert.match(validateSignup({ name: "Ann", email: "a@b.co", password: "password1", role: "admin" }).error, /role/);
});

test("login rejects operator objects (NoSQL injection)", () => {
  assert.ok(validateLogin({ email: { $gt: "" }, password: "x" }).error);
});

test("new complaint requires title, description and property", () => {
  assert.match(validateNewComplaint({ title: "Leak" }).error, /Description is required/);
  const ok = validateNewComplaint({ title: "Leak", description: "Water everywhere", property: "Block A", priority: "high" });
  assert.equal(ok.error, undefined);
  assert.equal(ok.data.priority, "high");
});

test("update rejects blank text and bad enum values", () => {
  assert.match(validateComplaintUpdate({ title: "   " }).error, /cannot be empty/);
  assert.match(validateComplaintUpdate({ status: "done" }).error, /status must be one of/);
  assert.deepEqual(validateComplaintUpdate({ status: "resolved" }).data, { status: "resolved" });
});

test("invalid filters are ignored", () => {
  assert.deepEqual(parseComplaintFilters({ status: "bogus", q: ["a"], category: "plumbing" }), { category: "plumbing" });
});
