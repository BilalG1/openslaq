import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import {
  hasDevSession,
  getDevSession,
  clearDevSession,
  performDevQuickSignIn,
  createDevUser,
  type DevSession,
} from "./dev-auth";

// Mock env module
mock.module("../env", () => ({
  env: {
    VITE_E2E_TEST_SECRET: "openslaq-e2e-test-secret-do-not-use-in-prod",
    VITE_STACK_PROJECT_ID: "924565c5-6377-44b7-aa75-6b7de8d311f4",
  },
}));

const STORAGE_KEY = "openslaq-dev-session";

describe("dev-auth localStorage helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("hasDevSession returns false when no session", () => {
    expect(hasDevSession()).toBe(false);
  });

  it("hasDevSession returns true when session exists", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId: "x" }));
    expect(hasDevSession()).toBe(true);
  });

  it("getDevSession returns null when no session", () => {
    expect(getDevSession()).toBeNull();
  });

  it("getDevSession returns parsed session", () => {
    const session: DevSession = {
      userId: "u1",
      displayName: "Test",
      email: "test@test.com",
      accessToken: "tok",
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    expect(getDevSession()).toEqual(session);
  });

  it("getDevSession returns null for invalid JSON", () => {
    localStorage.setItem(STORAGE_KEY, "not-json");
    expect(getDevSession()).toBeNull();
  });

  it("clearDevSession removes session", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId: "x" }));
    clearDevSession();
    expect(hasDevSession()).toBe(false);
  });
});

describe("performDevQuickSignIn", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("creates a dev session with a signed JWT and redirects", async () => {
    let assignedUrl = "";
    window.location.assign = (url: string | URL) => {
      assignedUrl = String(url);
    };

    await performDevQuickSignIn();

    // Session should be saved
    expect(hasDevSession()).toBe(true);
    const session = getDevSession()!;
    expect(session.userId).toBeTruthy();
    expect(session.displayName).toMatch(/^Dev User \d+$/);
    expect(session.email).toMatch(/^dev-\d+@openslaq\.local$/);
    expect(session.accessToken).toBeTruthy();

    // JWT should have 3 parts
    expect(session.accessToken.split(".")).toHaveLength(3);

    // Should redirect to /
    expect(assignedUrl).toBe("/");
  });
});

describe("createDevUser", () => {
  it("returns a user object with correct properties", () => {
    const session: DevSession = {
      userId: "dev-123",
      displayName: "Dev User 42",
      email: "dev-42@openslaq.local",
      accessToken: "jwt-token",
    };

    const user = createDevUser(session);
    expect(user.id).toBe("dev-123");
    expect(user.displayName).toBe("Dev User 42");
    expect(user.primaryEmail).toBe("dev-42@openslaq.local");
    expect(user.profileImageUrl).toBeNull();
  });

  it("getAuthJson returns the access token", async () => {
    const session: DevSession = {
      userId: "dev-123",
      displayName: "Dev User",
      email: "dev@openslaq.local",
      accessToken: "jwt-token",
    };

    const user = createDevUser(session);
    const authJson = await user.getAuthJson();
    expect(authJson.accessToken).toBe("jwt-token");
  });

  it("update modifies the localStorage session", async () => {
    const session: DevSession = {
      userId: "dev-123",
      displayName: "Old Name",
      email: "dev@openslaq.local",
      accessToken: "jwt-token",
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));

    const user = createDevUser(session);
    await user.update({ displayName: "New Name" });

    const updated = getDevSession()!;
    expect(updated.displayName).toBe("New Name");
  });
});
