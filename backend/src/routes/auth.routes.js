import express from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../utils/httpError.js";
import { login, me, signup } from "../controllers/auth.controller.js";

// Limits brute-force attempts on login/signup per client IP.
export function createAuthRouter({ authRateLimit }) {
  const router = express.Router();

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: authRateLimit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many attempts. Please wait a few minutes and try again." },
  });

  router.post("/signup", limiter, asyncHandler(signup));
  router.post("/login", limiter, asyncHandler(login));
  router.get("/me", authenticate, asyncHandler(me));

  return router;
}

export default createAuthRouter;
