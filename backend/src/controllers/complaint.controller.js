import mongoose from "mongoose";
import Complaint from "../models/Complaint.js";
import { EDITABLE_FIELDS } from "../constants/complaints.js";
import {
  parseComplaintFilters,
  validateComplaintUpdate,
  validateNewComplaint,
} from "../validators/index.js";

const AUTHOR_FIELDS = "name email";

const isManager = (user) => user.role === "manager";
const isOwner = (complaint, user) =>
  String(complaint.createdBy?._id ?? complaint.createdBy) === user.id;

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Route middleware: loads the complaint from :id into req.complaint, or responds 404.
// Residents can only load their own complaints (others look like they do not exist).
export async function loadComplaint(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: "Complaint not found" });
  }
  const complaint = await Complaint.findById(req.params.id).populate("createdBy", AUTHOR_FIELDS);
  if (!complaint || (!isManager(req.user) && !isOwner(complaint, req.user))) {
    return res.status(404).json({ message: "Complaint not found" });
  }
  req.complaint = complaint;
  return next();
}

// POST /api/complaints
export async function createComplaint(req, res) {
  const { data, error } = validateNewComplaint(req.body);
  if (error) return res.status(400).json({ message: error });

  const complaint = await Complaint.create({ ...data, createdBy: req.user.id });
  await complaint.populate("createdBy", AUTHOR_FIELDS);
  return res.status(201).json(complaint);
}

// GET /api/complaints — residents see their own, managers see all.
// Optional query filters: status, category, priority, q (text search)
export async function listComplaints(req, res) {
  const { q, ...exact } = parseComplaintFilters(req.query);
  const filter = isManager(req.user) ? { ...exact } : { ...exact, createdBy: req.user.id };

  if (q) {
    const pattern = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ title: pattern }, { description: pattern }, { property: pattern }];
  }

  // sanitizeFilter is switched off for this query only because $or/$regex are
  // built here on the server; every user-supplied value is validated above.
  const complaints = await Complaint.find(filter)
    .setOptions({ sanitizeFilter: false })
    .populate("createdBy", AUTHOR_FIELDS)
    .sort({ createdAt: -1 });

  return res.json(complaints);
}

// GET /api/complaints/:id
export function getComplaint(req, res) {
  return res.json(req.complaint);
}

// PATCH /api/complaints/:id
// - Managers can change the status of any complaint.
// - Residents can edit the details of their own complaints while they are still open.
export async function updateComplaint(req, res) {
  const { complaint, user } = req;
  const { data, error } = validateComplaintUpdate(req.body);
  if (error) return res.status(400).json({ message: error });

  if (data.status !== undefined && !isManager(user)) {
    return res.status(403).json({ message: "Only managers can update complaint status" });
  }

  const detailFields = EDITABLE_FIELDS.filter((field) => data[field] !== undefined);
  if (detailFields.length > 0) {
    if (!isOwner(complaint, user)) {
      return res
        .status(403)
        .json({ message: "Only the resident who reported it can edit a complaint" });
    }
    if (complaint.status !== "open") {
      return res.status(409).json({ message: "Complaints can only be edited while they are open" });
    }
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  complaint.set(data);
  await complaint.save();
  return res.json(complaint);
}

// DELETE /api/complaints/:id
// Residents can withdraw their own open complaints; managers can delete any complaint.
export async function deleteComplaint(req, res) {
  const { complaint, user } = req;
  if (!isManager(user) && complaint.status !== "open") {
    return res.status(409).json({ message: "Only open complaints can be withdrawn" });
  }
  await complaint.deleteOne();
  return res.json({ message: "Complaint deleted", id: complaint._id });
}

const countBy = (field) => [
  { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  { $sort: { count: -1, _id: 1 } },
];

const toMap = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.count]));

// GET /api/complaints/stats — manager analytics across all properties.
export async function getStats(req, res) {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - 13);

  const [result] = await Complaint.aggregate([
    {
      $facet: {
        total: [{ $count: "count" }],
        byStatus: countBy("status"),
        byCategory: countBy("category"),
        byPriority: countBy("priority"),
        openHighPriority: [
          { $match: { priority: "high", status: { $ne: "resolved" } } },
          { $count: "count" },
        ],
        byProperty: [
          {
            $group: {
              _id: "$property",
              total: { $sum: 1 },
              open: { $sum: { $cond: [{ $ne: ["$status", "resolved"] }, 1, 0] } },
            },
          },
          { $sort: { total: -1, _id: 1 } },
          { $limit: 8 },
        ],
        resolution: [
          { $match: { status: "resolved", resolvedAt: { $ne: null } } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              avgMs: { $avg: { $subtract: ["$resolvedAt", "$createdAt"] } },
            },
          },
        ],
        last14Days: [
          { $match: { createdAt: { $gte: since } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
      },
    },
  ]);

  const resolution = result.resolution[0];
  const perDay = toMap(result.last14Days);
  const trend = Array.from({ length: 14 }, (_, i) => {
    const day = new Date(since);
    day.setUTCDate(since.getUTCDate() + i);
    const key = day.toISOString().slice(0, 10);
    return { date: key, count: perDay[key] || 0 };
  });

  return res.json({
    total: result.total[0]?.count || 0,
    byStatus: toMap(result.byStatus),
    byCategory: toMap(result.byCategory),
    byPriority: toMap(result.byPriority),
    byProperty: result.byProperty.map((p) => ({ property: p._id, total: p.total, open: p.open })),
    openHighPriority: result.openHighPriority[0]?.count || 0,
    resolvedCount: resolution?.count || 0,
    averageResolutionHours: resolution ? Math.round((resolution.avgMs / 36e5) * 10) / 10 : null,
    trend,
  });
}
