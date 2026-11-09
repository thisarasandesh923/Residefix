import express from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/httpError.js";
import {
  createComplaint,
  deleteComplaint,
  getComplaint,
  getStats,
  listComplaints,
  loadComplaint,
  updateComplaint,
} from "../controllers/complaint.controller.js";

const router = express.Router();

// All complaint routes require a logged-in user
router.use(authenticate);

router.get("/", asyncHandler(listComplaints));
router.post("/", asyncHandler(createComplaint));
router.get("/stats", requireRole("manager"), asyncHandler(getStats));

router.get("/:id", asyncHandler(loadComplaint), getComplaint);
router.patch("/:id", asyncHandler(loadComplaint), asyncHandler(updateComplaint));
router.delete("/:id", asyncHandler(loadComplaint), asyncHandler(deleteComplaint));

export default router;
