import express from "express";
import mongoose from "mongoose";
import Complaint, {
  CATEGORIES,
  PRIORITIES,
  STATUSES,
} from "../models/Complaint.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// All complaint routes require a logged-in user
router.use(authMiddleware);

const EDITABLE_FIELDS = ["title", "description", "category", "priority", "property"];

const isManager = (user) => user.role === "manager";
const isOwner = (complaint, user) => String(complaint.createdBy?._id ?? complaint.createdBy) === user.id;

// Returns an error message if any provided enum value is invalid.
function validateEnums({ category, priority, status }) {
  if (category !== undefined && !CATEGORIES.includes(category)) {
    return `Category must be one of: ${CATEGORIES.join(", ")}`;
  }
  if (priority !== undefined && !PRIORITIES.includes(priority)) {
    return `Priority must be one of: ${PRIORITIES.join(", ")}`;
  }
  if (status !== undefined && !STATUSES.includes(status)) {
    return `Status must be one of: ${STATUSES.join(", ")}`;
  }
  return null;
}

// Loads the complaint from :id, or responds 404. Residents can only load their own.
async function loadComplaint(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: "Complaint not found" });
  }
  try {
    const complaint = await Complaint.findById(req.params.id).populate("createdBy", "name email");
    if (!complaint || (!isManager(req.user) && !isOwner(complaint, req.user))) {
      return res.status(404).json({ message: "Complaint not found" });
    }
    req.complaint = complaint;
    next();
  } catch (err) {
    next(err);
  }
}

// POST /api/complaints — create a new complaint
router.post("/", async (req, res, next) => {
  try {
    const { title, description, category, priority, property } = req.body;

    if (!title?.trim() || !description?.trim() || !property?.trim()) {
      return res.status(400).json({ message: "Title, description, and property are required" });
    }
    const enumError = validateEnums({ category, priority });
    if (enumError) return res.status(400).json({ message: enumError });

    const complaint = await Complaint.create({
      title,
      description,
      category,
      priority,
      property,
      createdBy: req.user.id,
    });
    await complaint.populate("createdBy", "name email");

    res.status(201).json(complaint);
  } catch (err) {
    next(err);
  }
});

// GET /api/complaints — list complaints (own complaints for residents)
// Optional query filters: status, category, priority, q (text search)
router.get("/", async (req, res, next) => {
  try {
    const { status, category, priority, q } = req.query;
    const filter = isManager(req.user) ? {} : { createdBy: req.user.id };

    if (status && STATUSES.includes(status)) filter.status = status;
    if (category && CATEGORIES.includes(category)) filter.category = category;
    if (priority && PRIORITIES.includes(priority)) filter.priority = priority;
    if (q?.trim()) {
      const pattern = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ title: pattern }, { description: pattern }, { property: pattern }];
    }

    const complaints = await Complaint.find(filter)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json(complaints);
  } catch (err) {
    next(err);
  }
});

// GET /api/complaints/:id — a single complaint
router.get("/:id", loadComplaint, (req, res) => {
  res.json(req.complaint);
});

// PATCH /api/complaints/:id
// - Managers can change the status of any complaint.
// - Residents can edit the details of their own complaints while they are still open.
router.patch("/:id", loadComplaint, async (req, res, next) => {
  try {
    const { complaint, user } = req;
    const updates = {};

    if (req.body.status !== undefined) {
      if (!isManager(user)) {
        return res.status(403).json({ message: "Only managers can update complaint status" });
      }
      updates.status = req.body.status;
    }

    const detailUpdates = EDITABLE_FIELDS.filter((field) => req.body[field] !== undefined);
    if (detailUpdates.length > 0) {
      if (!isOwner(complaint, user)) {
        return res.status(403).json({ message: "Only the resident who reported it can edit a complaint" });
      }
      if (complaint.status !== "open") {
        return res.status(409).json({ message: "Complaints can only be edited while they are open" });
      }
      for (const field of detailUpdates) {
        const value = req.body[field];
        if (["title", "description", "property"].includes(field) && !String(value).trim()) {
          return res.status(400).json({ message: `${field} cannot be empty` });
        }
        updates[field] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }
    const enumError = validateEnums(updates);
    if (enumError) return res.status(400).json({ message: enumError });

    complaint.set(updates);
    await complaint.save();
    res.json(complaint);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/complaints/:id
// Residents can withdraw their own open complaints; managers can delete any complaint.
router.delete("/:id", loadComplaint, async (req, res, next) => {
  try {
    const { complaint, user } = req;
    if (!isManager(user) && complaint.status !== "open") {
      return res.status(409).json({ message: "Only open complaints can be withdrawn" });
    }
    await complaint.deleteOne();
    res.json({ message: "Complaint deleted", id: complaint._id });
  } catch (err) {
    next(err);
  }
});

export default router;
