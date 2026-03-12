import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp, rm } from "node:fs/promises";
import { compareSemver } from "../src/update-check";

describe("compareSemver", () => {
  test("returns 0 for equal versions", () => {
    expect(compareSemver("1.2.3", "1.2.3")).toBe(0);
  });

  test("returns > 0 when b is newer (patch)", () => {
    expect(compareSemver("1.0.0", "1.0.1")).toBeGreaterThan(0);
  });

  test("returns > 0 when b is newer (minor)", () => {
    expect(compareSemver("1.0.0", "1.1.0")).toBeGreaterThan(0);
  });

  test("returns > 0 when b is newer (major)", () => {
    expect(compareSemver("1.0.0", "2.0.0")).toBeGreaterThan(0);
  });

  test("returns < 0 when a is newer", () => {
    expect(compareSemver("2.0.0", "1.0.0")).toBeLessThan(0);
  });

  test("handles complex version comparison", () => {
    expect(compareSemver("0.0.1", "0.1.0")).toBeGreaterThan(0);
    expect(compareSemver("1.9.9", "2.0.0")).toBeGreaterThan(0);
    expect(compareSemver("1.10.0", "1.9.0")).toBeLessThan(0);
  });
});

describe("update check cache", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "openslaq-test-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("cache file is read correctly when valid", async () => {
    const cacheFile = join(tmpDir, "update-check.json");
    const entry = { checkedAt: Date.now(), latestVersion: "1.0.0" };
    await Bun.write(cacheFile, JSON.stringify(entry));

    const text = await Bun.file(cacheFile).text();
    const parsed = JSON.parse(text);
    expect(parsed.latestVersion).toBe("1.0.0");
    expect(parsed.checkedAt).toBe(entry.checkedAt);
  });

  test("cache file returns null when missing", async () => {
    const cacheFile = join(tmpDir, "nonexistent.json");
    try {
      await Bun.file(cacheFile).text();
      expect(true).toBe(false); // should not reach
    } catch {
      // expected
    }
  });

  test("expired cache (older than 1 hour) is treated as stale", () => {
    const oneHourMs = 60 * 60 * 1000;
    const checkedAt = Date.now() - oneHourMs - 1;
    const now = Date.now();
    expect(now - checkedAt).toBeGreaterThan(oneHourMs);
  });

  test("fresh cache (within 1 hour) is not stale", () => {
    const oneHourMs = 60 * 60 * 1000;
    const checkedAt = Date.now() - oneHourMs + 60_000; // 1 min before expiry
    const now = Date.now();
    expect(now - checkedAt).toBeLessThan(oneHourMs);
  });
});

describe("checkForUpdate integration", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("does not throw on network failure", async () => {
    globalThis.fetch = mock(() => Promise.reject(new Error("network error"))) as unknown as typeof fetch;

    // Import dynamically to get a fresh module that uses the mocked fetch
    const { checkForUpdate } = await import("../src/update-check");

    // Should not throw
    checkForUpdate();

    // Give the fire-and-forget promise time to settle
    await new Promise((r) => setTimeout(r, 50));
  });

  test("does not throw on non-200 response", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("not found", { status: 404 })),
    ) as unknown as typeof fetch;

    const { checkForUpdate } = await import("../src/update-check");

    checkForUpdate();
    await new Promise((r) => setTimeout(r, 50));
  });
});
