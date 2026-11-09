import mongoose from "mongoose";
import { CATEGORIES, PRIORITIES, STATUSES } from "../constants/complaints.js";

// Re-exported for code that imported the lists from the model before.
export { CATEGORIES, PRIORITIES, STATUSES };

const complaintSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    category: { type: String, enum: CATEGORIES, default: "other" },
    priority: { type: String, enum: PRIORITIES, default: "medium" },
    status: { type: String, enum: STATUSES, default: "open" },
    property: { type: String, required: true, trim: true, maxlength: 120 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

complaintSchema.index({ createdBy: 1, createdAt: -1 });
complaintSchema.index({ status: 1 });

// Record when a complaint is resolved (and clear it if reopened).
complaintSchema.pre("save", function recordResolution() {
  if (this.isModified("status")) {
    this.resolvedAt = this.status === "resolved" ? new Date() : null;
  }
});

export default mongoose.model("Complaint", complaintSchema);
