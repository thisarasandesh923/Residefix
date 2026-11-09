// Backend API base URL.
// The Express server runs on port 5000 (locally or in Docker on the same machine).
// Override it at build/dev time with VITE_API_URL if the backend lives elsewhere.
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const CATEGORIES = ["electrical", "plumbing", "internet", "security", "other"];
export const PRIORITIES = ["low", "medium", "high"];
export const STATUSES = ["open", "in-progress", "resolved"];

export const STATUS_LABELS = {
  open: "Open",
  "in-progress": "In progress",
  resolved: "Resolved",
};

export function getSession() {
  try {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return token && user ? { token, user } : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// fetch wrapper: adds the JWT, sends/parses JSON and turns failures into ApiError.
export async function apiRequest(path, { method = "GET", body } = {}) {
  const session = getSession();
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (session) headers.Authorization = `Bearer ${session.token}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Could not reach the server. Is the backend running?", 0);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.message || `Request failed (${res.status})`, res.status);
  }
  return data;
}
