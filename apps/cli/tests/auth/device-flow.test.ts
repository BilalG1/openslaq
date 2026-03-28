import { describe, test, expect } from "bun:test";
import {
  initiateDeviceFlow,
  pollForToken,
  refreshAccessToken,
} from "../../src/auth/device-flow";

function mockFetch(responses: { status: number; body: unknown }[]): typeof fetch {
  let callIndex = 0;
  const calls: { url: string; init: RequestInit }[] = [];

  const fn = async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    calls.push({ url, init: init ?? {} });
    const response = responses[callIndex++];
    if (!response) throw new Error("No more mock responses");
    return new Response(JSON.stringify(response.body), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  };

  (fn as unknown as { calls: typeof calls }).calls = calls;
  return fn as unknown as typeof fetch;
}

function getCalls(fn: typeof fetch): { url: string; init: RequestInit }[] {
  return (fn as unknown as { calls: { url: string; init: RequestInit }[] }).calls;
}

// ── initiateDeviceFlow ──────────────────────────────────────────────

describe("initiateDeviceFlow", () => {
  test("sends correct headers and returns codes", async () => {
    const fetchFn = mockFetch([
      {
        status: 200,
        body: { polling_code: "poll123", login_code: "login456" },
      },
    ]);

    const result = await initiateDeviceFlow(fetchFn);
    expect(result).toEqual({ pollingCode: "poll123", loginCode: "login456" });

    const calls = getCalls(fetchFn);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toContain("/api/v1/auth/cli");
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers["x-stack-project-id"]).toBeDefined();
    expect(headers["x-stack-access-type"]).toBe("client");
    expect(headers["x-stack-publishable-client-key"]).toBeDefined();
  });

  test("sends JSON body with expires_in_millis", async () => {
    const fetchFn = mockFetch([
      { status: 200, body: { polling_code: "p", login_code: "l" } },
    ]);
    await initiateDeviceFlow(fetchFn);
    const calls = getCalls(fetchFn);
    const body = JSON.parse(calls[0]!.init.body as string);
    expect(body.expires_in_millis).toBe(600_000);
  });

  test("sends Content-Type application/json", async () => {
    const fetchFn = mockFetch([
      { status: 200, body: { polling_code: "p", login_code: "l" } },
    ]);
    await initiateDeviceFlow(fetchFn);
    const headers = getCalls(fetchFn)[0]!.init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  test("throws on non-OK response", async () => {
    const fetchFn = mockFetch([{ status: 500, body: { error: "fail" } }]);
    await expect(initiateDeviceFlow(fetchFn)).rejects.toThrow(
      "Failed to initiate device flow: 500",
    );
  });

  test("throws on 403 forbidden", async () => {
    const fetchFn = mockFetch([
      { status: 403, body: { error: "invalid project" } },
    ]);
    await expect(initiateDeviceFlow(fetchFn)).rejects.toThrow(
      "Failed to initiate device flow: 403",
    );
  });

  test("throws on 429 rate limit", async () => {
    const fetchFn = mockFetch([
      { status: 429, body: { error: "too many requests" } },
    ]);
    await expect(initiateDeviceFlow(fetchFn)).rejects.toThrow(
      "Failed to initiate device flow: 429",
    );
  });
});

// ── pollForToken ────────────────────────────────────────────────────

describe("pollForToken", () => {
  test("returns refresh token on success", async () => {
    const fetchFn = mockFetch([
      { status: 200, body: { status: "pending" } },
      { status: 200, body: { status: "complete", refresh_token: "rt_abc" } },
    ]);

    const token = await pollForToken("poll123", fetchFn);
    expect(token).toBe("rt_abc");

    const calls = getCalls(fetchFn);
    expect(calls).toHaveLength(2);
    for (const call of calls) {
      expect(call.url).toContain("/api/v1/auth/cli/poll");
      const body = JSON.parse(call.init.body as string);
      expect(body.polling_code).toBe("poll123");
    }
  });

  test("returns immediately when first poll has token", async () => {
    const fetchFn = mockFetch([
      { status: 200, body: { status: "complete", refresh_token: "rt_fast" } },
    ]);
    const token = await pollForToken("poll1", fetchFn);
    expect(token).toBe("rt_fast");
    expect(getCalls(fetchFn)).toHaveLength(1);
  });

  test("skips non-OK responses and keeps polling", async () => {
    const fetchFn = mockFetch([
      { status: 500, body: { error: "server error" } },
      { status: 200, body: { status: "complete", refresh_token: "rt_retry" } },
    ]);
    const token = await pollForToken("poll1", fetchFn);
    expect(token).toBe("rt_retry");
    expect(getCalls(fetchFn)).toHaveLength(2);
  });

  test("sends correct headers on each poll request", async () => {
    const fetchFn = mockFetch([
      { status: 200, body: { status: "complete", refresh_token: "rt_x" } },
    ]);
    await pollForToken("poll1", fetchFn);
    const headers = getCalls(fetchFn)[0]!.init.headers as Record<string, string>;
    expect(headers["x-stack-project-id"]).toBeDefined();
    expect(headers["x-stack-access-type"]).toBe("client");
    expect(headers["x-stack-publishable-client-key"]).toBeDefined();
    expect(headers["Content-Type"]).toBe("application/json");
  });

  test("ignores OK response without refresh_token", async () => {
    const fetchFn = mockFetch([
      { status: 200, body: { status: "pending" } },
      { status: 200, body: { status: "pending", refresh_token: undefined } },
      { status: 200, body: { status: "complete", refresh_token: "rt_got" } },
    ]);
    const token = await pollForToken("poll1", fetchFn);
    expect(token).toBe("rt_got");
    expect(getCalls(fetchFn)).toHaveLength(3);
  });
});

// ── refreshAccessToken ──────────────────────────────────────────────

describe("refreshAccessToken", () => {
  test("sends refresh token header and returns access token", async () => {
    const fetchFn = mockFetch([
      { status: 200, body: { access_token: "at_new" } },
    ]);

    const token = await refreshAccessToken("rt_test", fetchFn);
    expect(token).toBe("at_new");

    const calls = getCalls(fetchFn);
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers["x-stack-refresh-token"]).toBe("rt_test");
  });

  test("sends empty JSON body", async () => {
    const fetchFn = mockFetch([
      { status: 200, body: { access_token: "at_x" } },
    ]);
    await refreshAccessToken("rt_test", fetchFn);
    const calls = getCalls(fetchFn);
    const body = JSON.parse(calls[0]!.init.body as string);
    expect(body).toEqual({});
  });

  test("sends all required Stack Auth headers", async () => {
    const fetchFn = mockFetch([
      { status: 200, body: { access_token: "at_x" } },
    ]);
    await refreshAccessToken("rt_test", fetchFn);
    const headers = getCalls(fetchFn)[0]!.init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["x-stack-project-id"]).toBeDefined();
    expect(headers["x-stack-access-type"]).toBe("client");
    expect(headers["x-stack-publishable-client-key"]).toBeDefined();
    expect(headers["x-stack-refresh-token"]).toBe("rt_test");
  });

  test("calls correct URL", async () => {
    const fetchFn = mockFetch([
      { status: 200, body: { access_token: "at_x" } },
    ]);
    await refreshAccessToken("rt_test", fetchFn);
    const url = getCalls(fetchFn)[0]!.url;
    expect(url).toContain("/api/v1/auth/sessions/current/refresh");
  });

  test("throws on 401 with error details in message", async () => {
    const fetchFn = mockFetch([
      { status: 401, body: { code: "INVALID_TOKEN", error: "Token expired" } },
    ]);
    await expect(refreshAccessToken("rt_bad", fetchFn)).rejects.toThrow(
      "INVALID_TOKEN",
    );
  });

  test("throws on 400 body parsing error", async () => {
    const fetchFn = mockFetch([
      {
        status: 400,
        body: { code: "BODY_PARSING_ERROR", error: "Invalid JSON in request body" },
      },
    ]);
    await expect(refreshAccessToken("rt_bad", fetchFn)).rejects.toThrow(
      "BODY_PARSING_ERROR",
    );
  });

  test("throws on 500 server error", async () => {
    const fetchFn = mockFetch([
      { status: 500, body: { error: "internal server error" } },
    ]);
    await expect(refreshAccessToken("rt_test", fetchFn)).rejects.toThrow(
      "Failed to refresh token: 500",
    );
  });

  test("uses POST method", async () => {
    const fetchFn = mockFetch([
      { status: 200, body: { access_token: "at_x" } },
    ]);
    await refreshAccessToken("rt_test", fetchFn);
    expect(getCalls(fetchFn)[0]!.init.method).toBe("POST");
  });
});
