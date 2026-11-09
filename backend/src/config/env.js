import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";

// Loads backend/.env for local development. In Docker the variables come from
// compose.yaml and no .env file exists inside the image, which is fine.
dotenv.config({ quiet: true });

export class ConfigError extends Error {
  constructor(problems) {
    super(`Invalid configuration:\n  - ${problems.join("\n  - ")}`);
    this.name = "ConfigError";
    this.problems = problems;
  }
}

const MIN_SECRET_LENGTH = 32;

// When JWT_SECRET is not supplied, a strong random secret is generated once and
// kept in JWT_SECRET_FILE (a Docker volume), so tokens survive restarts and
// nobody has to invent a secret by hand. Nothing is ever written to the repo.
function resolveJwtSecret(source, problems) {
  const fromEnv = source.JWT_SECRET?.trim();
  if (fromEnv) {
    if (fromEnv.length < MIN_SECRET_LENGTH) {
      problems.push(`JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters long`);
    }
    return fromEnv;
  }

  const secretFile = source.JWT_SECRET_FILE?.trim();
  if (!secretFile) {
    problems.push("JWT_SECRET is not set (and no JWT_SECRET_FILE was given to generate one)");
    return undefined;
  }

  try {
    if (fs.existsSync(secretFile)) {
      const stored = fs.readFileSync(secretFile, "utf8").trim();
      if (stored.length >= MIN_SECRET_LENGTH) return stored;
    }
    const generated = crypto.randomBytes(48).toString("base64url");
    fs.mkdirSync(path.dirname(secretFile), { recursive: true });
    fs.writeFileSync(secretFile, `${generated}\n`, { mode: 0o600 });
    return generated;
  } catch (err) {
    problems.push(`Could not read or create JWT_SECRET_FILE (${secretFile}): ${err.code || err.message}`);
    return undefined;
  }
}

function parsePort(value, problems) {
  const port = Number(value ?? 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    problems.push(`PORT must be a number between 1 and 65535 (got "${value}")`);
  }
  return port;
}

// Removes the password from a MongoDB URI so it can be logged safely.
export function redactMongoUri(uri) {
  return String(uri).replace(/\/\/([^:/@]+):([^@]+)@/, "//$1:****@");
}

/**
 * Reads and validates every setting the backend needs. Throws ConfigError with
 * a readable list of problems instead of letting mongoose fail later with
 * "The `uri` parameter to openUri() must be a string, got undefined".
 */
export function loadConfig(source = process.env) {
  const problems = [];

  const mongoUri = source.MONGO_URI?.trim();
  if (!mongoUri) {
    problems.push(
      "MONGO_URI is not set. Use mongodb://mongo:27017/residefix in Docker or " +
        "mongodb://localhost:27017/residefix when running the backend directly on your computer"
    );
  } else if (!/^mongodb(\+srv)?:\/\//.test(mongoUri)) {
    problems.push("MONGO_URI must start with mongodb:// or mongodb+srv://");
  }

  const config = {
    nodeEnv: source.NODE_ENV || "development",
    port: parsePort(source.PORT, problems),
    mongoUri,
    jwtSecret: resolveJwtSecret(source, problems),
    jwtExpiresIn: source.JWT_EXPIRES_IN?.trim() || "7d",
    // Comma separated list of browser origins allowed to call the API directly.
    // Empty = same-origin only (the Nginx proxy setup used in Docker needs no CORS).
    corsOrigins: (source.CORS_ORIGINS || "")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
    // Number of reverse proxies in front of the API (Nginx in Docker = 1).
    trustProxy: Number(source.TRUST_PROXY ?? 0),
    authRateLimit: Number(source.AUTH_RATE_LIMIT ?? 20),
  };

  if (!Number.isInteger(config.trustProxy) || config.trustProxy < 0) {
    problems.push("TRUST_PROXY must be a whole number (0 when not behind a proxy)");
  }
  if (!Number.isInteger(config.authRateLimit) || config.authRateLimit < 1) {
    problems.push("AUTH_RATE_LIMIT must be a positive whole number");
  }

  if (problems.length > 0) throw new ConfigError(problems);
  return Object.freeze(config);
}
