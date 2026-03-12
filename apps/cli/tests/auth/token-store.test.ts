import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
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

  test("save and load tokens", async () => {
    const tokens = { refreshToken: "rt_test", accessToken: "at_test" };
    await saveTokens(tokens, filePath);
    const loaded = await loadTokens(filePath);
    expect(loaded).toEqual(tokens);
  });

  test("load returns null when file is missing", async () => {
    const loaded = await loadTokens(join(tempDir, "nonexistent.json"));
    expect(loaded).toBeNull();
  });

  test("clear removes the file", async () => {
    await saveTokens({ refreshToken: "rt", accessToken: "at" }, filePath);
    await clearTokens(filePath);
    const loaded = await loadTokens(filePath);
    expect(loaded).toBeNull();
  });

  test("clear on missing file does not throw", async () => {
    await clearTokens(join(tempDir, "nonexistent.json"));
  });

  test("creates nested directory if needed", async () => {
    const nested = join(tempDir, "a", "b", "auth.json");
    await saveTokens({ refreshToken: "rt", accessToken: "at" }, nested);
    const loaded = await loadTokens(nested);
    expect(loaded).toEqual({ refreshToken: "rt", accessToken: "at" });
  });

  test("returns null for invalid JSON", async () => {
    await Bun.write(filePath, "not json");
    const loaded = await loadTokens(filePath);
    expect(loaded).toBeNull();
  });

  test("returns null for JSON missing required fields", async () => {
    await Bun.write(filePath, JSON.stringify({ refreshToken: "rt" }));
    const loaded = await loadTokens(filePath);
    expect(loaded).toBeNull();
  });

  test("save and load with apiKey only", async () => {
    const tokens = { refreshToken: "", accessToken: "", apiKey: "osk_testkey123" };
    await saveTokens(tokens, filePath);
    const loaded = await loadTokens(filePath);
    expect(loaded).toEqual(tokens);
    expect(loaded!.apiKey).toBe("osk_testkey123");
  });

  test("apiKey-only file is considered valid", async () => {
    await Bun.write(filePath, JSON.stringify({ apiKey: "osk_abc" }));
    const loaded = await loadTokens(filePath);
    expect(loaded).not.toBeNull();
    expect(loaded!.apiKey).toBe("osk_abc");
  });
});
