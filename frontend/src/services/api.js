import { getSession } from "./session";

// All API calls go to a path on the SAME origin as the website ("/api").
// - Docker / lab PC: Nginx serves the site and forwards /api to the backend.
// - `npm run dev`:   Vite forwards /api to http://localhost:5000 (vite.config.js).
// This is why the site works from any computer on the LAN: the browser never
// calls "localhost", it calls whatever host it loaded the page from.
// VITE_API_URL can still point at a separate backend if ever needed.
export const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// fetch wrapper: adds the JWT, sends/parses JSON and turns failures into ApiError.
export async function apiRequest(path, { method = "GET", body, auth = true } = {}) {
  const session = auth ? getSession() : null;
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (session) headers.Authorization = `Bearer ${session.token}`;

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Could not reach the server. Check your network connection.", 0);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fallback =
      res.status >= 500 ? "The server is not available right now. Please try again." : `Request failed (${res.status})`;
    throw new ApiError(data.message || fallback, res.status);
  }
  return data;
}

export const authApi = {
  login: (credentials) => apiRequest("/auth/login", { method: "POST", body: credentials, auth: false }),
  signup: (details) => apiRequest("/auth/signup", { method: "POST", body: details, auth: false }),
};

export const complaintsApi = {
  list: () => apiRequest("/complaints"),
  stats: () => apiRequest("/complaints/stats"),
  create: (data) => apiRequest("/complaints", { method: "POST", body: data }),
  update: (id, data) => apiRequest(`/complaints/${id}`, { method: "PATCH", body: data }),
  remove: (id) => apiRequest(`/complaints/${id}`, { method: "DELETE" }),
};
