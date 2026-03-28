import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";

/**
 * Unit test for bulk-upload error message formatting.
 * The failed-emoji log line should use `:name:` (single colon), not `:name::`.
 */

// Mock authenticatedFetch before importing the command module
const mockAuthFetch = mock(() => Promise.resolve(new Response()));
mock.module("../../src/client", () => ({
  getAuthenticatedClient: mock(),
  authenticatedFetch: mockAuthFetch,
  getAuthToken: mock(() => Promise.resolve("fake-token")),
}));

// We need to import the command after mocking
const { emojiCommand } = await import("../../src/commands/emoji");

describe("emoji bulk-upload error formatting", () => {
  let errorLogs: string[];
  let originalError: typeof console.error;
  let originalLog: typeof console.log;

  beforeEach(() => {
    errorLogs = [];
    originalError = console.error;
    originalLog = console.log;
    console.error = (...args: unknown[]) => {
      errorLogs.push(args.map(String).join(" "));
    };
    // Suppress normal logs
    console.log = () => {};
  });

  afterEach(() => {
    console.error = originalError;
    console.log = originalLog;
    mockAuthFetch.mockReset();
  });

  test("failed emoji error message uses single colon after name", async () => {
    // Mock authenticatedFetch to return a non-ok, non-409 response
    mockAuthFetch.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: "server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    // Create a temp directory with a test image
    const fs = await import("node:fs");
    const os = await import("node:os");
    const path = await import("node:path");

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "emoji-test-"));
    // Write a minimal file so the glob finds it
    fs.writeFileSync(path.join(tmpDir, "smiley.png"), "fake-image-data");

    try {
      const bulkUpload = emojiCommand.subcommands!["bulk-upload"];
      if (!bulkUpload || !("action" in bulkUpload)) throw new Error("missing bulk-upload action");
      await bulkUpload.action({
        dir: tmpDir,
        workspace: "default",
        json: false,
      } as import("../../src/framework").ErasedFlags);

      // Find the error log line
      const failedLine = errorLogs.find((l) => l.includes("Failed"));
      expect(failedLine).toBeDefined();
      // Should contain `:smiley:` with single colons, NOT `:smiley::`
      expect(failedLine).toContain(":smiley: ");
      expect(failedLine).not.toContain(":smiley::");
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });
});
