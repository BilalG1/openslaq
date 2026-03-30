import { describe, expect, it, mock } from "bun:test";
import { ApiError, AuthError } from "../errors";
import { authorizedHeaders, authorizedRequest, withRetry } from "../api-client";
import type { AuthProvider } from "../../platform/types";

function makeAuth(overrides: Partial<AuthProvider> = {}): AuthProvider {
  return {
    getAccessToken: async () => "token-1",
    requireAccessToken: async () => "token-1",
    onAuthRequired: () => {},
    ...overrides,
  };
}

function makeResponse(
  status: number,
  body?: unknown,
): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  }) as Response & { ok: boolean };
}

describe("authorizedHeaders", () => {
  it("returns bearer auth header from requireAccessToken", async () => {
    const auth = makeAuth({ requireAccessToken: async () => "abc123" });
    await expect(authorizedHeaders(auth)).resolves.toEqual({ Authorization: "Bearer abc123" });
  });
});

describe("authorizedRequest", () => {
  it("passes authorization headers to request callback", async () => {
    const auth = makeAuth({ requireAccessToken: async () => "pass-through" });

    const response = await authorizedRequest(auth, async (headers) => {
      expect(headers).toEqual({ Authorization: "Bearer pass-through" });
      return makeResponse(200, { ok: true });
    });

    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("throws AuthError for 401 when no refreshAccessToken is provided", async () => {
    const auth = makeAuth();

    await expect(
      authorizedRequest(auth, async () => makeResponse(401, { error: "Unauthorized" })),
    ).rejects.toBeInstanceOf(AuthError);
  });

  it("retries with refreshed token on 401", async () => {
    let callCount = 0;
    const onAuthRequired = mock();
    const auth = makeAuth({
      refreshAccessToken: async () => "refreshed-token",
      requireAccessToken: async () => (callCount === 0 ? "expired-token" : "refreshed-token"),
      onAuthRequired,
    });

    const response = await authorizedRequest(auth, async (headers) => {
      callCount++;
      if (callCount === 1) {
        expect(headers).toEqual({ Authorization: "Bearer expired-token" });
        return makeResponse(401, { error: "Unauthorized" });
      }
      expect(headers).toEqual({ Authorization: "Bearer refreshed-token" });
      return makeResponse(200, { ok: true });
    });

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(onAuthRequired).not.toHaveBeenCalled();
  });

  it("calls onAuthRequired when refresh returns null on 401", async () => {
    const onAuthRequired = mock();
    const auth = makeAuth({
      refreshAccessToken: async () => null,
      onAuthRequired,
    });

    await expect(
      authorizedRequest(auth, async () => makeResponse(401, { error: "Unauthorized" })),
    ).rejects.toBeInstanceOf(AuthError);
    expect(onAuthRequired).toHaveBeenCalledTimes(1);
  });

  it("calls onAuthRequired when retry also returns 401", async () => {
    const onAuthRequired = mock();
    const auth = makeAuth({
      refreshAccessToken: async () => "refreshed-token",
      onAuthRequired,
    });

    await expect(
      authorizedRequest(auth, async () => makeResponse(401, { error: "Unauthorized" })),
    ).rejects.toBeInstanceOf(AuthError);
    expect(onAuthRequired).toHaveBeenCalledTimes(1);
  });

  it("throws ApiError with server message for non-401 failures", async () => {
    const auth = makeAuth();

    await expect(
      authorizedRequest(auth, async () => makeResponse(500, { error: "Boom" })),
    ).rejects.toEqual(expect.objectContaining({ name: "ApiError", message: "Boom", status: 500 }));
  });

  it("uses fallback error when response body is not JSON", async () => {
    const auth = makeAuth();

    await expect(
      authorizedRequest(auth, async () => new Response("not-json", { status: 502 })),
    ).rejects.toEqual(
      expect.objectContaining({
        name: "ApiError",
        message: "Request failed with status 502",
        status: 502,
      }),
    );
  });

  it("preserves ApiError status for callers", async () => {
    const auth = makeAuth();

    try {
      await authorizedRequest(auth, async () => makeResponse(409, { error: "Conflict" }));
      throw new Error("Expected call to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(409);
    }
  });
});

describe("withRetry", () => {
  it("returns result on first success", async () => {
    const result = await withRetry(async () => "ok");
    expect(result).toBe("ok");
  });

  it("retries on network error (TypeError) and succeeds", async () => {
    const fn = mock()
      .mockImplementationOnce(() => { throw new TypeError("Failed to fetch"); })
      .mockImplementationOnce(() => "recovered");

    const result = await withRetry(fn, { baseDelay: 1 });
    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries on 503 ApiError and succeeds on second attempt", async () => {
    const fn = mock()
      .mockImplementationOnce(() => { throw new ApiError(503, "Service Unavailable"); })
      .mockImplementationOnce(() => "ok");

    const result = await withRetry(fn, { baseDelay: 1 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries on 502 and 504 status codes", async () => {
    for (const status of [502, 504]) {
      const fn = mock()
        .mockImplementationOnce(() => { throw new ApiError(status, "Gateway error"); })
        .mockImplementationOnce(() => "ok");

      const result = await withRetry(fn, { baseDelay: 1 });
      expect(result).toBe("ok");
    }
  });

  it("does NOT retry on AuthError (401)", async () => {
    const fn = mock().mockImplementation(() => { throw new AuthError(); });

    await expect(withRetry(fn, { baseDelay: 1 })).rejects.toBeInstanceOf(AuthError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry on 400 client error", async () => {
    const fn = mock().mockImplementation(() => { throw new ApiError(400, "Bad Request"); });

    await expect(withRetry(fn, { baseDelay: 1 })).rejects.toBeInstanceOf(ApiError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry on 404", async () => {
    const fn = mock().mockImplementation(() => { throw new ApiError(404, "Not Found"); });

    await expect(withRetry(fn, { baseDelay: 1 })).rejects.toBeInstanceOf(ApiError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws after exhausting retries", async () => {
    const fn = mock().mockImplementation(() => { throw new TypeError("Failed to fetch"); });

    await expect(withRetry(fn, { maxRetries: 2, baseDelay: 1 })).rejects.toBeInstanceOf(TypeError);
    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it("respects custom maxRetries", async () => {
    const fn = mock().mockImplementation(() => { throw new ApiError(503, "down"); });

    await expect(withRetry(fn, { maxRetries: 1, baseDelay: 1 })).rejects.toBeInstanceOf(ApiError);
    expect(fn).toHaveBeenCalledTimes(2); // 1 initial + 1 retry
  });
});
