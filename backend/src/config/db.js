import mongoose from "mongoose";
import { redactMongoUri } from "./env.js";
import logger from "../utils/logger.js";

// Reject query objects such as { "$gt": "" } coming from request bodies.
mongoose.set("sanitizeFilter", true);
mongoose.set("strictQuery", true);

const RETRY_DELAY_MS = 3000;
const MAX_ATTEMPTS = 20;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Connects to MongoDB, retrying while the database container is still starting.
 * Gives up after MAX_ATTEMPTS so Docker's restart policy can take over.
 */
export async function connectDatabase(uri, { attempts = MAX_ATTEMPTS } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      logger.info(`Connected to MongoDB at ${redactMongoUri(uri)}`);
      return mongoose.connection;
    } catch (err) {
      logger.warn(`MongoDB connection attempt ${attempt}/${attempts} failed: ${err.message}`);
      if (attempt === attempts) throw err;
      await sleep(RETRY_DELAY_MS);
    }
  }
  return undefined;
}

export const isDatabaseReady = () => mongoose.connection.readyState === 1;

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
