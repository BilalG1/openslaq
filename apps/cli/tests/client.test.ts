import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";
import * as tokenStore from "../src/auth/token-store";
import * as deviceFlow from "../src/auth/device-flow";
import { getAuthToken, getAuthenticatedClient } from "../src/client";

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
});
