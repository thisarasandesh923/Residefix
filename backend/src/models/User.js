import mongoose from "mongoose";
import { ROLES } from "../constants/complaints.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    // bcrypt hash only; never returned to clients (see toPublicUser).
    password: { type: String, required: true },
    role: { type: String, enum: ROLES, default: "resident" },
    property: { type: String, default: "", trim: true, maxlength: 120 },
  },
  { timestamps: true }
);

export const toPublicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  property: user.property,
});

export default mongoose.model("User", userSchema);
