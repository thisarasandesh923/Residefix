import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ConfigError, loadConfig, redactMongoUri } from "../src/config/env.js";

const SECRET = "x".repeat(40);

test("missing MONGO_URI fails with a clear message instead of undefined", () => {
  assert.throws(
    () => loadConfig({ JWT_SECRET: SECRET }),
    (err) => err instanceof ConfigError && /MONGO_URI is not set/.test(err.message)
  );
});

test("MONGO_URI must be a mongodb:// URI", () => {
  assert.throws(() => loadConfig({ MONGO_URI: "localhost:27017", JWT_SECRET: SECRET }), ConfigError);
});

test("short JWT_SECRET is rejected", () => {
  assert.throws(
    () => loadConfig({ MONGO_URI: "mongodb://mongo:27017/residefix", JWT_SECRET: "short" }),
    /at least 32 characters/
  );
});

test("valid settings are parsed with defaults", () => {
  const config = loadConfig({ MONGO_URI: "mongodb://mongo:27017/residefix", JWT_SECRET: SECRET });
  assert.equal(config.port, 5000);
  assert.equal(config.jwtExpiresIn, "7d");
  assert.deepEqual(config.corsOrigins, []);
});

test("JWT secret is generated once into JWT_SECRET_FILE and then reused", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "residefix-"));
  const file = path.join(dir, "secrets", "jwt_secret");
  const env = { MONGO_URI: "mongodb://mongo:27017/residefix", JWT_SECRET_FILE: file };

  const first = loadConfig(env).jwtSecret;
  const second = loadConfig(env).jwtSecret;

  assert.ok(first.length >= 32);
  assert.equal(first, second);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("passwords are hidden when a URI is logged", () => {
  assert.equal(
    redactMongoUri("mongodb://admin:s3cret@mongo:27017/residefix"),
    "mongodb://admin:****@mongo:27017/residefix"
  );
});
