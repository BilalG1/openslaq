import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getAccessToken, requireAccessToken, redirectToAuth } from "./auth";
import { AuthError } from "@openslaq/client-core";

const STORAGE_KEY = "openslaq-dev-session";

const mockSignOut = vi.fn(() => Promise.resolve());
vi.mock("../stack", () => ({
  stackApp: { signOut: () => mockSignOut() },
}));

describe("getAccessToken", () => {
  it("returns null when user is null", async () => {
    expect(await getAccessToken(null)).toBeNull();
  });

  it("returns null when user is undefined", async () => {
    expect(await getAccessToken(undefined)).toBeNull();
  });

  it("returns the access token from getAuthJson", async () => {
    const user = { getAuthJson: async () => ({ accessToken: "tok-123" }) };
    expect(await getAccessToken(user)).toBe("tok-123");
  });

  it("returns null when accessToken is null", async () => {
    const user = { getAuthJson: async () => ({ accessToken: null }) };
    expect(await getAccessToken(user)).toBeNull();
  });

  it("returns null when accessToken is undefined", async () => {
    const user = { getAuthJson: async () => ({}) };
    expect(await getAccessToken(user)).toBeNull();
  });
});

describe("requireAccessToken", () => {
  it("returns the token when available", async () => {
    const user = { getAuthJson: async () => ({ accessToken: "tok-abc" }) };
    expect(await requireAccessToken(user)).toBe("tok-abc");
  });

  it("throws AuthError when user is null", async () => {
    await expect(requireAccessToken(null)).rejects.toThrow(AuthError);
  });

  it("throws AuthError when token is null", async () => {
    const user = { getAuthJson: async () => ({ accessToken: null }) };
    await expect(requireAccessToken(user)).rejects.toThrow(AuthError);
  });
});

describe("redirectToAuth", () => {
  let assignedUrl: string;

  beforeEach(() => {
    localStorage.clear();
    mockSignOut.mockClear();
    assignedUrl = "";
    window.location.assign = (url: string | URL) => {
      assignedUrl = String(url);
    };
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("clears dev session from localStorage", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ userId: "u1", displayName: "Dev", email: "d@d", accessToken: "expired" }),
    );

    await redirectToAuth();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("signs out of Stack Auth", async () => {
    await redirectToAuth();
    expect(mockSignOut).toHaveBeenCalledOnce();
  });

  it("redirects to /handler/sign-in", async () => {
    await redirectToAuth();
    expect(assignedUrl).toBe("/handler/sign-in");
  });

  it("clears dev session before signing out (order matters)", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ userId: "u1", displayName: "Dev", email: "d@d", accessToken: "expired" }),
    );

    // Track when dev session is cleared relative to signOut
    let devSessionClearedBeforeSignOut = false;
    mockSignOut.mockImplementation(async () => {
      devSessionClearedBeforeSignOut = localStorage.getItem(STORAGE_KEY) === null;
    });

    await redirectToAuth();

    expect(devSessionClearedBeforeSignOut).toBe(true);
  });
});
