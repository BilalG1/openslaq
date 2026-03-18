import { describe, expect, test } from "bun:test";
import type { User } from "../types";
import { createClient } from "./test-utils";

const fakeUser: User = {
  id: "user-1",
  displayName: "Alice",
  email: "alice@test.com",
  avatarUrl: null,
  statusEmoji: null,
  statusText: null,
  statusExpiresAt: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("Users resource", () => {
  test("me() GETs current user", async () => {
    let capturedUrl = "";
    const client = createClient((url) => {
      capturedUrl = url;
      return { status: 200, body: fakeUser };
    });

    const result = await client.users.me();
    expect(capturedUrl).toContain("/api/users/me");
    expect(capturedUrl).not.toContain("/workspaces/");
    expect(result.displayName).toBe("Alice");
  });

  test("updateMe() PATCHes current user", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    let capturedBody = "";
    const client = createClient((url, init) => {
      capturedUrl = url;
      capturedMethod = init?.method ?? "";
      capturedBody = init?.body as string;
      return { status: 200, body: { ...fakeUser, displayName: "Bob" } };
    });

    const result = await client.users.updateMe({ displayName: "Bob" });
    expect(capturedUrl).toContain("/api/users/me");
    expect(capturedUrl).not.toContain("/workspaces/");
    expect(capturedMethod).toBe("PATCH");
    expect(JSON.parse(capturedBody)).toEqual({ displayName: "Bob" });
    expect(result.displayName).toBe("Bob");
  });

  test("setStatus() PUTs status", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    let capturedBody = "";
    const client = createClient((url, init) => {
      capturedUrl = url;
      capturedMethod = init?.method ?? "";
      capturedBody = init?.body as string;
      return { status: 200, body: undefined };
    });

    await client.users.setStatus({ emoji: "🏖️", text: "On vacation" });
    expect(capturedUrl).toContain("/api/users/me/status");
    expect(capturedUrl).not.toContain("/workspaces/");
    expect(capturedMethod).toBe("PUT");
    expect(JSON.parse(capturedBody)).toEqual({ emoji: "🏖️", text: "On vacation" });
  });

  test("clearStatus() DELETEs status", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    const client = createClient((url, init) => {
      capturedUrl = url;
      capturedMethod = init?.method ?? "";
      return { status: 200, body: undefined };
    });

    await client.users.clearStatus();
    expect(capturedUrl).toContain("/api/users/me/status");
    expect(capturedUrl).not.toContain("/workspaces/");
    expect(capturedMethod).toBe("DELETE");
  });
});
