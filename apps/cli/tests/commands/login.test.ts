import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";
import * as tokenStore from "../../src/auth/token-store";
import { loginCommand } from "../../src/commands/login";

class ExitError extends Error {
  code: number;
  constructor(code: number) {
    super(`process.exit(${code})`);
    this.code = code;
  }
}

let exitSpy: ReturnType<typeof spyOn>;
let errorSpy: ReturnType<typeof spyOn>;
let logSpy: ReturnType<typeof spyOn>;
let saveSpy: ReturnType<typeof spyOn>;

beforeEach(() => {
  exitSpy = spyOn(process, "exit").mockImplementation((code) => {
    throw new ExitError(code as number);
  });
  errorSpy = spyOn(console, "error").mockImplementation(() => {});
  logSpy = spyOn(console, "log").mockImplementation(() => {});
  saveSpy = spyOn(tokenStore, "saveTokens").mockResolvedValue(undefined);
});

afterEach(() => {
  exitSpy.mockRestore();
  errorSpy.mockRestore();
  logSpy.mockRestore();
  saveSpy.mockRestore();
});

describe("login --bot-token", () => {
  test("saves bot token and prints confirmation", async () => {
    await loginCommand.action({
      "api-key": undefined,
      "bot-token": "osb_test_token_123",
    });
    expect(saveSpy).toHaveBeenCalledWith({
      refreshToken: "",
      accessToken: "",
      apiKey: "osb_test_token_123",
    });
    expect(logSpy).toHaveBeenCalledWith(
      "Bot token saved. Run `openslaq whoami` to verify.",
    );
  });

  test("rejects tokens without osb_ prefix", async () => {
    await expect(
      loginCommand.action({
        "api-key": undefined,
        "bot-token": "invalid_token",
      }),
    ).rejects.toThrow(ExitError);
    expect(errorSpy).toHaveBeenCalledWith("Bot tokens must start with osb_");
    expect(saveSpy).not.toHaveBeenCalled();
  });

  test("bot-token takes priority over api-key", async () => {
    await loginCommand.action({
      "api-key": "osk_should_be_ignored",
      "bot-token": "osb_bot_wins",
    });
    expect(saveSpy).toHaveBeenCalledWith({
      refreshToken: "",
      accessToken: "",
      apiKey: "osb_bot_wins",
    });
  });
});

describe("login --api-key", () => {
  test("saves API key and prints confirmation", async () => {
    await loginCommand.action({
      "api-key": "osk_test_key",
      "bot-token": undefined,
    });
    expect(saveSpy).toHaveBeenCalledWith({
      refreshToken: "",
      accessToken: "",
      apiKey: "osk_test_key",
    });
    expect(logSpy).toHaveBeenCalledWith(
      "API key saved. Run `openslaq whoami` to verify.",
    );
  });
});
