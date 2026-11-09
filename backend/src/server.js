import process from "node:process";
import { ConfigError, loadConfig } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./config/db.js";
import { createApp } from "./app.js";
import logger from "./utils/logger.js";

async function start() {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    if (err instanceof ConfigError) {
      logger.error(err.message);
      logger.error("Fix the values in backend/.env (local) or the root .env / compose.yaml (Docker).");
      process.exit(1);
    }
    throw err;
  }

  try {
    await connectDatabase(config.mongoUri);
  } catch (err) {
    logger.error(`Could not connect to MongoDB: ${err.message}`);
    // Exit so Docker's restart policy can try again once MongoDB is reachable.
    process.exit(1);
  }

  const app = createApp(config);
  const server = app.listen(config.port, "0.0.0.0", () => {
    logger.info(`ResideFix API listening on port ${config.port} (${config.nodeEnv})`);
  });

  // Graceful shutdown: stop accepting connections, finish in-flight requests,
  // then close the database connection. Docker sends SIGTERM on `docker compose stop`.
  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received, shutting down`);
    const forceExit = setTimeout(() => process.exit(1), 10_000);
    forceExit.unref();
    server.close(async () => {
      await disconnectDatabase().catch(() => {});
      logger.info("Shutdown complete");
      process.exit(0);
    });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start();
