import { CATEGORIES, PRIORITIES, ROLES, STATUSES } from "../constants/complaints.js";

// Small hand-written validators. Each returns { value } or { error }.
// Only strings are accepted for text fields, which also blocks objects such as
// { "$gt": "" } from reaching database queries.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

const isString = (v) => typeof v === "string";

function text(body, field, { required = false, max, label = field } = {}) {
  const raw = body[field];
  if (raw === undefined || raw === null || raw === "") {
    return required ? { error: `${label} is required` } : { value: undefined };
  }
  if (!isString(raw)) return { error: `${label} must be text` };
  const value = raw.trim();
  if (required && !value) return { error: `${label} is required` };
  if (max && value.length > max) return { error: `${label} must be at most ${max} characters` };
  return { value };
}

function oneOf(body, field, allowed) {
  const raw = body[field];
  if (raw === undefined) return { value: undefined };
  if (!allowed.includes(raw)) return { error: `${field} must be one of: ${allowed.join(", ")}` };
  return { value: raw };
}

// Runs the given checks and returns { data } or { error } (first error wins).
function collect(checks) {
  const data = {};
  for (const [field, result] of Object.entries(checks)) {
    if (result.error) return { error: result.error };
    if (result.value !== undefined) data[field] = result.value;
  }
  return { data };
}

export function validateSignup(body = {}) {
  const result = collect({
    name: text(body, "name", { required: true, max: 80, label: "Name" }),
    email: text(body, "email", { required: true, max: 254, label: "Email" }),
    password: isString(body.password)
      ? { value: body.password }
      : { error: "Password is required" },
    role: oneOf(body, "role", ROLES),
    property: text(body, "property", { max: 120, label: "Property" }),
  });
  if (result.error) return result;

  const { data } = result;
  if (data.name.length < 2) return { error: "Name must be at least 2 characters" };
  data.email = data.email.toLowerCase();
  if (!EMAIL_PATTERN.test(data.email)) return { error: "Please enter a valid email address" };
  if (data.password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }
  if (data.password.length > 128) return { error: "Password must be at most 128 characters" };
  data.role = data.role || "resident";
  data.property = data.property || "";
  return { data };
}

export function validateLogin(body = {}) {
  if (!isString(body.email) || !body.email.trim() || !isString(body.password) || !body.password) {
    return { error: "Email and password are required" };
  }
  return { data: { email: body.email.trim().toLowerCase(), password: body.password } };
}

const complaintChecks = (body, required) => ({
  title: text(body, "title", { required, max: 120, label: "Title" }),
  description: text(body, "description", { required, max: 2000, label: "Description" }),
  property: text(body, "property", { required, max: 120, label: "Property" }),
  category: oneOf(body, "category", CATEGORIES),
  priority: oneOf(body, "priority", PRIORITIES),
});

export function validateNewComplaint(body = {}) {
  return collect(complaintChecks(body, true));
}

// For PATCH: every field is optional, but a provided text field may not be blank.
export function validateComplaintUpdate(body = {}) {
  const checks = complaintChecks(body, false);
  for (const field of ["title", "description", "property"]) {
    if (body[field] !== undefined && isString(body[field]) && !body[field].trim()) {
      return { error: `${field} cannot be empty` };
    }
  }
  return collect({ ...checks, status: oneOf(body, "status", STATUSES) });
}

// Query string filters: invalid values are ignored rather than rejected.
export function parseComplaintFilters(query = {}) {
  const filters = {};
  if (STATUSES.includes(query.status)) filters.status = query.status;
  if (CATEGORIES.includes(query.category)) filters.category = query.category;
  if (PRIORITIES.includes(query.priority)) filters.priority = query.priority;
  if (isString(query.q) && query.q.trim()) filters.q = query.q.trim().slice(0, 100);
  return filters;
}
