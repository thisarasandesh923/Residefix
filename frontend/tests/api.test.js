import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_BASE_URL, ApiError, apiRequest, complaintsApi } from "../src/services/api";
import { saveSession, clearSession } from "../src/services/session";

const jsonResponse = (status, body) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

describe("api service", () => {
  beforeEach(() => {
    clearSession();
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("uses a same-origin relative base URL, never localhost", () => {
    expect(API_BASE_URL).toBe("/api");
    expect(API_BASE_URL).not.toMatch(/localhost|127\.0\.0\.1/);
  });

  it("sends the JWT and JSON body", async () => {
    saveSession({ token: "abc.def.ghi", user: { id: "1", name: "A", role: "resident" } });
    fetch.mockReturnValue(jsonResponse(201, { _id: "x" }));

    await complaintsApi.create({ title: "Leak" });

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe("/api/complaints");
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe("Bearer abc.def.ghi");
    expect(JSON.parse(options.body)).toEqual({ title: "Leak" });
  });

  it("turns an error response into ApiError with the server message", async () => {
    fetch.mockReturnValue(jsonResponse(409, { message: "Already exists" }));
    await expect(apiRequest("/auth/signup", { method: "POST", body: {} })).rejects.toMatchObject({
      name: "ApiError",
      status: 409,
      message: "Already exists",
    });
  });

  it("reports network failures with status 0", async () => {
    fetch.mockRejectedValue(new TypeError("Failed to fetch"));
    const error = await apiRequest("/complaints").catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
  });
});
