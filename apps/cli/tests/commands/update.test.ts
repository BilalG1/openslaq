import { describe, test, expect, beforeEach, afterEach, spyOn, mock } from "bun:test";
import * as updateCheck from "../../src/update-check";
import { updateCommand } from "../../src/commands/update";

let logSpy: ReturnType<typeof spyOn>;
let errorSpy: ReturnType<typeof spyOn>;
let exitSpy: ReturnType<typeof spyOn>;
let fetchLatestSpy: ReturnType<typeof spyOn>;

beforeEach(() => {
  logSpy = spyOn(console, "log").mockImplementation(() => {});
  errorSpy = spyOn(console, "error").mockImplementation(() => {});
  exitSpy = spyOn(process, "exit").mockImplementation((code) => {
    throw new Error(`process.exit(${code})`);
  });
  fetchLatestSpy = spyOn(updateCheck, "fetchLatestVersion");
});

afterEach(() => {
  logSpy.mockRestore();
  errorSpy.mockRestore();
  exitSpy.mockRestore();
  fetchLatestSpy.mockRestore();
});

describe("update command", () => {
  test("prints already on latest when versions match", async () => {
    fetchLatestSpy.mockResolvedValue("0.0.5");
    // Mock VERSION to match
    const versionMod = await import("../../src/version");
    const currentVersion = versionMod.VERSION;
    fetchLatestSpy.mockResolvedValue(currentVersion);

    await updateCommand.action({});

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Already on the latest version"),
    );
  });

  test("prints already on latest when current is newer", async () => {
    fetchLatestSpy.mockResolvedValue("0.0.1");

    await updateCommand.action({});

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Already on the latest version"),
    );
  });

  test("exits with error when fetch fails", async () => {
    fetchLatestSpy.mockResolvedValue(null);

    await expect(updateCommand.action({})).rejects.toThrow("process.exit(1)");
    expect(errorSpy).toHaveBeenCalledWith("Failed to check for updates.");
  });
});
