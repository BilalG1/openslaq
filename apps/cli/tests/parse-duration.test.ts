import { describe, test, expect } from "bun:test";
import { parseDuration } from "../src/parse-duration";

describe("parseDuration", () => {
  test("parses minutes", () => {
    const before = Date.now();
    const result = new Date(parseDuration("30m")).getTime();
    const after = Date.now();
    // Should be ~30 minutes from now
    expect(result).toBeGreaterThanOrEqual(before + 30 * 60_000);
    expect(result).toBeLessThanOrEqual(after + 30 * 60_000);
  });

  test("parses hours", () => {
    const before = Date.now();
    const result = new Date(parseDuration("2h")).getTime();
    const after = Date.now();
    expect(result).toBeGreaterThanOrEqual(before + 2 * 3_600_000);
    expect(result).toBeLessThanOrEqual(after + 2 * 3_600_000);
  });

  test("parses days", () => {
    const before = Date.now();
    const result = new Date(parseDuration("1d")).getTime();
    const after = Date.now();
    expect(result).toBeGreaterThanOrEqual(before + 86_400_000);
    expect(result).toBeLessThanOrEqual(after + 86_400_000);
  });

  test("parses ISO datetime string", () => {
    const iso = "2030-06-15T12:00:00.000Z";
    const result = parseDuration(iso);
    expect(result).toBe(iso);
  });

  test("throws on invalid input", () => {
    expect(() => parseDuration("abc")).toThrow("Invalid duration or datetime");
  });

  test("throws on empty string", () => {
    expect(() => parseDuration("")).toThrow("Invalid duration or datetime");
  });

  test("returns ISO string format", () => {
    const result = parseDuration("1h");
    // Should be a valid ISO string
    expect(new Date(result).toISOString()).toBe(result);
  });
});
