import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { saveTokens, loadTokens, clearTokens } from "../../src/auth/token-store";

describe("token-store", () => {
  let tempDir: string;
  let filePath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "openslaq-test-"));
    filePath = join(tempDir, "auth.json");
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  // ── save and load ─────────────────────────────────────────────────

  test("save and load tokens", async () => {
    const tokens = { refreshToken: "rt_test", accessToken: "at_test" };
    await saveTokens(tokens, filePath);
    const loaded = await loadTokens(filePath);
    expect(loaded).toEqual(tokens);
  });

  test("save overwrites existing tokens", async () => {
    await saveTokens({ refreshToken: "rt1", accessToken: "at1" }, filePath);
    await saveTokens({ refreshToken: "rt2", accessToken: "at2" }, filePath);
    const loaded = await loadTokens(filePath);
    expect(loaded).toEqual({ refreshToken: "rt2", accessToken: "at2" });
  });

  test("save and load with apiKey only", async () => {
    const tokens = { refreshToken: "", accessToken: "", apiKey: "osk_testkey123" };
    await saveTokens(tokens, filePath);
    const loaded = await loadTokens(filePath);
    expect(loaded).toEqual(tokens);
    expect(loaded!.apiKey).toBe("osk_testkey123");
  });

  test("save preserves all three fields together", async () => {
    const tokens = { refreshToken: "rt", accessToken: "at", apiKey: "osk_key" };
    await saveTokens(tokens, filePath);
    const loaded = await loadTokens(filePath);
    expect(loaded).toEqual(tokens);
  });

  // ── file permissions ──────────────────────────────────────────────

  test("saved file has restricted permissions (0o600)", async () => {
    await saveTokens({ refreshToken: "rt", accessToken: "at" }, filePath);
    const st = await stat(filePath);
    // 0o600 = owner read/write only (33152 in decimal on macOS)
    expect(st.mode & 0o777).toBe(0o600);
  });

  test("creates nested directory if needed", async () => {
    const nested = join(tempDir, "a", "b", "auth.json");
    await saveTokens({ refreshToken: "rt", accessToken: "at" }, nested);
    const loaded = await loadTokens(nested);
    expect(loaded).toEqual({ refreshToken: "rt", accessToken: "at" });
  });

  // ── load edge cases ───────────────────────────────────────────────

  test("load returns null when file is missing", async () => {
    const loaded = await loadTokens(join(tempDir, "nonexistent.json"));
    expect(loaded).toBeNull();
  });

  test("returns null for invalid JSON", async () => {
    await Bun.write(filePath, "not json");
    const loaded = await loadTokens(filePath);
    expect(loaded).toBeNull();
  });

  test("returns null for empty file", async () => {
    await Bun.write(filePath, "");
    const loaded = await loadTokens(filePath);
    expect(loaded).toBeNull();
  });

  test("returns null for JSON missing required fields", async () => {
    await Bun.write(filePath, JSON.stringify({ refreshToken: "rt" }));
    const loaded = await loadTokens(filePath);
    expect(loaded).toBeNull();
  });

  test("returns null for JSON with only accessToken", async () => {
    await Bun.write(filePath, JSON.stringify({ accessToken: "at" }));
    const loaded = await loadTokens(filePath);
    expect(loaded).toBeNull();
  });

  test("returns null for JSON array", async () => {
    await Bun.write(filePath, JSON.stringify(["not", "an", "object"]));
    const loaded = await loadTokens(filePath);
    expect(loaded).toBeNull();
  });

  test("returns null for JSON number", async () => {
    await Bun.write(filePath, "42");
    const loaded = await loadTokens(filePath);
    expect(loaded).toBeNull();
  });

  test("apiKey-only file is considered valid", async () => {
    await Bun.write(filePath, JSON.stringify({ apiKey: "osk_abc" }));
    const loaded = await loadTokens(filePath);
    expect(loaded).not.toBeNull();
    expect(loaded!.apiKey).toBe("osk_abc");
  });

  test("empty string apiKey is not valid (falsy)", async () => {
    await Bun.write(filePath, JSON.stringify({ apiKey: "" }));
    const loaded = await loadTokens(filePath);
    expect(loaded).toBeNull();
  });

  // ── clear ─────────────────────────────────────────────────────────

  test("clear removes the file", async () => {
    await saveTokens({ refreshToken: "rt", accessToken: "at" }, filePath);
    await clearTokens(filePath);
    const loaded = await loadTokens(filePath);
    expect(loaded).toBeNull();
  });

  test("clear on missing file does not throw", async () => {
    await clearTokens(join(tempDir, "nonexistent.json"));
  });

  test("double clear does not throw", async () => {
    await saveTokens({ refreshToken: "rt", accessToken: "at" }, filePath);
    await clearTokens(filePath);
    await clearTokens(filePath);
  });
});
