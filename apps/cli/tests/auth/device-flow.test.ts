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

  test("throws on non-OK response", async () => {
    const fetchFn = mockFetch([{ status: 500, body: { error: "fail" } }]);
    await expect(initiateDeviceFlow(fetchFn)).rejects.toThrow(
      "Failed to initiate device flow: 500",
    );
  });
});

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
});

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

  test("throws on failure", async () => {
    const fetchFn = mockFetch([{ status: 401, body: {} }]);
    await expect(refreshAccessToken("rt_bad", fetchFn)).rejects.toThrow(
      "Failed to refresh token: 401",
    );
  });
});
