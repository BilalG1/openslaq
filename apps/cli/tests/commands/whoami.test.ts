import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";
import * as client from "../../src/client";
import { whoamiCommand } from "../../src/commands/whoami";

let logSpy: ReturnType<typeof spyOn>;
let errorSpy: ReturnType<typeof spyOn>;
let exitSpy: ReturnType<typeof spyOn>;
let getAuthTokenSpy: ReturnType<typeof spyOn>;
let getAuthenticatedClientSpy: ReturnType<typeof spyOn>;

const fakeUser = {
  id: "user-1",
  displayName: "Test Bot",
  email: "test-bot@bot.openslaq",
  avatarUrl: null,
  statusEmoji: null,
  statusText: null,
  statusExpiresAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function mockClient(user: typeof fakeUser) {
  return {
    api: {
      users: {
        me: {
          $get: async () => ({
            ok: true,
            json: async () => user,
          }),
        },
      },
    },
  };
}

beforeEach(() => {
  logSpy = spyOn(console, "log").mockImplementation(() => {});
  errorSpy = spyOn(console, "error").mockImplementation(() => {});
  exitSpy = spyOn(process, "exit").mockImplementation((code) => {
    throw new Error(`process.exit(${code})`);
  });
  getAuthTokenSpy = spyOn(client, "getAuthToken");
  getAuthenticatedClientSpy = spyOn(client, "getAuthenticatedClient");
});

afterEach(() => {
  logSpy.mockRestore();
  errorSpy.mockRestore();
  exitSpy.mockRestore();
  getAuthTokenSpy.mockRestore();
  getAuthenticatedClientSpy.mockRestore();
});

describe("whoami", () => {
  test("shows 'Bot:' prefix for bot tokens", async () => {
    getAuthTokenSpy.mockResolvedValue("osb_test_token");
    getAuthenticatedClientSpy.mockResolvedValue(mockClient(fakeUser));

    await whoamiCommand.action({ json: false });

    expect(logSpy).toHaveBeenCalledWith("Bot: Test Bot");
  });

  test("shows name and email for regular users", async () => {
    const regularUser = { ...fakeUser, displayName: "Alice", email: "alice@test.com" };
    getAuthTokenSpy.mockResolvedValue("eyJhbG...");
    getAuthenticatedClientSpy.mockResolvedValue(mockClient(regularUser));

    await whoamiCommand.action({ json: false });

    expect(logSpy).toHaveBeenCalledWith("Alice (alice@test.com)");
  });

  test("shows name and email for API key users", async () => {
    const regularUser = { ...fakeUser, displayName: "Alice", email: "alice@test.com" };
    getAuthTokenSpy.mockResolvedValue("osk_user_key");
    getAuthenticatedClientSpy.mockResolvedValue(mockClient(regularUser));

    await whoamiCommand.action({ json: false });

    expect(logSpy).toHaveBeenCalledWith("Alice (alice@test.com)");
  });

  test("json output includes authKind for bot", async () => {
    getAuthTokenSpy.mockResolvedValue("osb_test_token");
    getAuthenticatedClientSpy.mockResolvedValue(mockClient(fakeUser));

    await whoamiCommand.action({ json: true });

    const output = JSON.parse(logSpy.mock.calls[0]![0] as string);
    expect(output.authKind).toBe("bot");
    expect(output.displayName).toBe("Test Bot");
  });

  test("json output includes authKind for api_key", async () => {
    getAuthTokenSpy.mockResolvedValue("osk_test_key");
    getAuthenticatedClientSpy.mockResolvedValue(mockClient(fakeUser));

    await whoamiCommand.action({ json: true });

    const output = JSON.parse(logSpy.mock.calls[0]![0] as string);
    expect(output.authKind).toBe("api_key");
  });

  test("json output includes authKind jwt for regular tokens", async () => {
    getAuthTokenSpy.mockResolvedValue("eyJhbG...");
    getAuthenticatedClientSpy.mockResolvedValue(mockClient(fakeUser));

    await whoamiCommand.action({ json: true });

    const output = JSON.parse(logSpy.mock.calls[0]![0] as string);
    expect(output.authKind).toBe("jwt");
  });
});
