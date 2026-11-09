import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createAuthRouter } from "./routes/auth.routes.js";
import complaintRoutes from "./routes/complaint.routes.js";
import healthRoutes from "./routes/health.routes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

/**
 * Builds the Express application. Kept separate from server.js so tests can
 * create an app without opening a network port.
 */
export function createApp(config) {
  const app = express();
  app.locals.config = config;

  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy);

  app.use(helmet());
  // Same-origin requests (through Nginx) need no CORS. Extra origins, e.g. the
  // Vite dev server on another machine, can be allowed with CORS_ORIGINS.
  app.use(cors({ origin: config.corsOrigins.length > 0 ? config.corsOrigins : false }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/", (req, res) => {
    res.send("ResideFix API is running");
  });

  app.use("/api/health", healthRoutes);
  app.use("/api/auth", createAuthRouter(config));
  app.use("/api/complaints", complaintRoutes);

  app.use("/api", notFound);
  app.use(errorHandler);

  return app;
}

export default createApp;
