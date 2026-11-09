// Must match backend/src/constants/complaints.js
export const CATEGORIES = ["electrical", "plumbing", "internet", "security", "other"];
export const PRIORITIES = ["low", "medium", "high"];
export const STATUSES = ["open", "in-progress", "resolved"];

export const STATUS_LABELS = {
  open: "Open",
  "in-progress": "In progress",
  resolved: "Resolved",
};

export const MIN_PASSWORD_LENGTH = 8;

export const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
