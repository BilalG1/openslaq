import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";
import * as tokenStore from "../src/auth/token-store";
import * as deviceFlow from "../src/auth/device-flow";
import { getAuthToken, getAuthenticatedClient, authenticatedFetch } from "../src/client";

// ── sentinel for process.exit ───────────────────────────────────────

class ExitError extends Error {
  code: number;
  constructor(code: number) {
    super(`process.exit(${code})`);
    this.code = code;
  }
}

let exitSpy: ReturnType<typeof spyOn>;
let errorSpy: ReturnType<typeof spyOn>;
let loadSpy: ReturnType<typeof spyOn>;
let saveSpy: ReturnType<typeof spyOn>;
let refreshSpy: ReturnType<typeof spyOn>;

beforeEach(() => {
  exitSpy = spyOn(process, "exit").mockImplementation((code) => {
    throw new ExitError(code as number);
  });
  errorSpy = spyOn(console, "error").mockImplementation(() => {});
  loadSpy = spyOn(tokenStore, "loadTokens");
  saveSpy = spyOn(tokenStore, "saveTokens").mockResolvedValue(undefined);
  refreshSpy = spyOn(deviceFlow, "refreshAccessToken");
});

afterEach(() => {
  exitSpy.mockRestore();
  errorSpy.mockRestore();
  loadSpy.mockRestore();
  saveSpy.mockRestore();
  refreshSpy.mockRestore();
});

// ── getAuthToken ────────────────────────────────────────────────────

describe("getAuthToken", () => {
  const originalEnv = process.env.OPENSLAQ_API_KEY;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.OPENSLAQ_API_KEY;
    } else {
      process.env.OPENSLAQ_API_KEY = originalEnv;
    }
  });

  test("not logged in → exit(1) + message", async () => {
    delete process.env.OPENSLAQ_API_KEY;
    loadSpy.mockResolvedValue(null);
    await expect(getAuthToken()).rejects.toThrow(ExitError);
    expect(errorSpy).toHaveBeenCalledWith(
      "Not logged in. Run `openslaq login` first.",
    );
  });

  test("OPENSLAQ_API_KEY env var takes highest priority", async () => {
    process.env.OPENSLAQ_API_KEY = "osk_env_key";
    const token = await getAuthToken();
    expect(token).toBe("osk_env_key");
    expect(loadSpy).not.toHaveBeenCalled();
  });

  test("OPENSLAQ_API_KEY env var skips token refresh entirely", async () => {
    process.env.OPENSLAQ_API_KEY = "osk_env_key";
    await getAuthToken();
    expect(refreshSpy).not.toHaveBeenCalled();
    expect(saveSpy).not.toHaveBeenCalled();
  });

  test("stored apiKey takes priority over JWT tokens", async () => {
    delete process.env.OPENSLAQ_API_KEY;
    loadSpy.mockResolvedValue({
      refreshToken: "rt-1",
      accessToken: "at-1",
      apiKey: "osk_stored_key",
    });
    const token = await getAuthToken();
    expect(token).toBe("osk_stored_key");
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  test("stored apiKey does not trigger save", async () => {
    delete process.env.OPENSLAQ_API_KEY;
    loadSpy.mockResolvedValue({
      refreshToken: "",
      accessToken: "",
      apiKey: "osk_stored",
    });
    await getAuthToken();
    expect(saveSpy).not.toHaveBeenCalled();
  });

  test("refresh succeeds → saves new token and returns it", async () => {
    delete process.env.OPENSLAQ_API_KEY;
    loadSpy.mockResolvedValue({
      refreshToken: "rt-1",
      accessToken: "old-at",
    });
    refreshSpy.mockResolvedValue("fresh-at");

    const token = await getAuthToken();
    expect(token).toBe("fresh-at");
    expect(refreshSpy).toHaveBeenCalledWith("rt-1");
    expect(saveSpy).toHaveBeenCalledWith({
      refreshToken: "rt-1",
      accessToken: "fresh-at",
    });
  });

  test("refresh succeeds → preserves original refreshToken in saved tokens", async () => {
    delete process.env.OPENSLAQ_API_KEY;
    loadSpy.mockResolvedValue({
      refreshToken: "rt-original",
      accessToken: "old-at",
    });
    refreshSpy.mockResolvedValue("new-at");

    await getAuthToken();
    const savedTokens = saveSpy.mock.calls[0]![0] as tokenStore.StoredTokens;
    expect(savedTokens.refreshToken).toBe("rt-original");
    expect(savedTokens.accessToken).toBe("new-at");
  });

  test("refresh fails → returns stale accessToken, does not save", async () => {
    delete process.env.OPENSLAQ_API_KEY;
    loadSpy.mockResolvedValue({
      refreshToken: "rt-1",
      accessToken: "stale-at",
    });
    refreshSpy.mockRejectedValue(new Error("network error"));

    const token = await getAuthToken();
    expect(token).toBe("stale-at");
    expect(saveSpy).not.toHaveBeenCalled();
  });

  test("refresh fails with 401 → still returns stale token silently", async () => {
    delete process.env.OPENSLAQ_API_KEY;
    loadSpy.mockResolvedValue({
      refreshToken: "rt-expired",
      accessToken: "stale-at",
    });
    refreshSpy.mockRejectedValue(new Error("Failed to refresh token: 401"));

    const token = await getAuthToken();
    expect(token).toBe("stale-at");
  });

  test("refresh fails with 400 body parsing → still returns stale token", async () => {
    delete process.env.OPENSLAQ_API_KEY;
    loadSpy.mockResolvedValue({
      refreshToken: "rt-1",
      accessToken: "stale-at",
    });
    refreshSpy.mockRejectedValue(
      new Error('Failed to refresh token: 400 {"code":"BODY_PARSING_ERROR"}'),
    );

    const token = await getAuthToken();
    expect(token).toBe("stale-at");
  });

  test("tokens with empty refreshToken but valid apiKey still work", async () => {
    delete process.env.OPENSLAQ_API_KEY;
    loadSpy.mockResolvedValue({
      refreshToken: "",
      accessToken: "",
      apiKey: "osk_key",
    });
    const token = await getAuthToken();
    expect(token).toBe("osk_key");
  });

  test("OPENSLAQ_API_KEY with bot token (osb_) works", async () => {
    process.env.OPENSLAQ_API_KEY = "osb_bot_token";
    const token = await getAuthToken();
    expect(token).toBe("osb_bot_token");
    expect(loadSpy).not.toHaveBeenCalled();
  });

  test("stored bot token via apiKey field works", async () => {
    delete process.env.OPENSLAQ_API_KEY;
    loadSpy.mockResolvedValue({
      refreshToken: "",
      accessToken: "",
      apiKey: "osb_stored_bot",
    });
    const token = await getAuthToken();
    expect(token).toBe("osb_stored_bot");
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  test("empty OPENSLAQ_API_KEY env var is not used", async () => {
    process.env.OPENSLAQ_API_KEY = "";
    loadSpy.mockResolvedValue({
      refreshToken: "rt-1",
      accessToken: "at-1",
      apiKey: "osk_stored",
    });
    const token = await getAuthToken();
    // Empty string is falsy, so falls through to stored apiKey
    expect(token).toBe("osk_stored");
  });
});

// ── getAuthenticatedClient ──────────────────────────────────────────

describe("getAuthenticatedClient", () => {
  test("returns a client when auth succeeds", async () => {
    loadSpy.mockResolvedValue({
      refreshToken: "rt-1",
      accessToken: "at-1",
    });
    refreshSpy.mockResolvedValue("at-2");

    const client = await getAuthenticatedClient("http://localhost:3001");
    expect(client).toBeDefined();
    expect(typeof client).toBeOneOf(["object", "function"]);
  });

  test("exits when not logged in", async () => {
    delete process.env.OPENSLAQ_API_KEY;
    loadSpy.mockResolvedValue(null);
    await expect(
      getAuthenticatedClient("http://localhost:3001"),
    ).rejects.toThrow(ExitError);
  });
});

// ── authenticatedFetch ──────────────────────────────────────────────

describe("authenticatedFetch", () => {
  test("adds Authorization header to requests", async () => {
    delete process.env.OPENSLAQ_API_KEY;
    loadSpy.mockResolvedValue({
      refreshToken: "rt-1",
      accessToken: "at-1",
      apiKey: "osk_test",
    });

    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("ok"),
    );
    try {
      await authenticatedFetch("/api/uploads");
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const callArgs = fetchSpy.mock.calls[0]!;
      const init = callArgs[1] as RequestInit;
      expect((init.headers as Record<string, string>).Authorization).toBe(
        "Bearer osk_test",
      );
    } finally {
      fetchSpy.mockRestore();
    }
  });

  test("merges custom headers with auth header", async () => {
    delete process.env.OPENSLAQ_API_KEY;
    loadSpy.mockResolvedValue({
      refreshToken: "",
      accessToken: "",
      apiKey: "osk_test",
    });

    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("ok"),
    );
    try {
      await authenticatedFetch("/api/uploads", {
        headers: { "X-Custom": "value" },
      });
      const init = fetchSpy.mock.calls[0]![1] as RequestInit;
      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer osk_test");
      expect(headers["X-Custom"]).toBe("value");
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
