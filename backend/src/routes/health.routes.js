import process from "node:process";
import express from "express";
import { isDatabaseReady } from "../config/db.js";

const router = express.Router();

// Liveness: the process is up and answering HTTP.
router.get("/", (req, res) => {
  res.json({ status: "ok", uptimeSeconds: Math.round(process.uptime()) });
});

// Readiness: the API can serve real requests (database connected).
router.get("/ready", (req, res) => {
  const database = isDatabaseReady() ? "up" : "down";
  res.status(database === "up" ? 200 : 503).json({
    status: database === "up" ? "ready" : "not-ready",
    database,
  });
});

export default router;
