import mongoose from "mongoose";

export const CATEGORIES = ["electrical", "plumbing", "internet", "security", "other"];
export const PRIORITIES = ["low", "medium", "high"];
export const STATUSES = ["open", "in-progress", "resolved"];

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

// Record when a complaint is resolved (and clear it if reopened).
complaintSchema.pre("save", function () {
  if (this.isModified("status")) {
    this.resolvedAt = this.status === "resolved" ? new Date() : null;
  }
});

export default mongoose.model("Complaint", complaintSchema);
