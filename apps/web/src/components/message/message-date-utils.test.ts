import { describe, expect, test } from "vitest";
import { getMessageDateKey, isDifferentDay } from "./message-date-utils";

// These functions use local time (new Date().getDate()), so test with
// timestamps that produce the same local date regardless of timezone offset.

describe("getMessageDateKey", () => {
  test("formats ISO date to YYYY-MM-DD", () => {
    expect(getMessageDateKey("2026-03-15T14:30:00.000Z")).toBe("2026-03-15");
  });

  test("pads single-digit month and day", () => {
    expect(getMessageDateKey("2026-01-05T12:00:00.000Z")).toBe("2026-01-05");
  });

  test("handles end of year", () => {
    expect(getMessageDateKey("2025-12-31T12:00:00.000Z")).toBe("2025-12-31");
  });

  test("handles start of year", () => {
    expect(getMessageDateKey("2026-01-01T12:00:00.000Z")).toBe("2026-01-01");
  });
});

describe("isDifferentDay", () => {
  test("returns false for same day", () => {
    expect(isDifferentDay("2026-03-15T10:00:00.000Z", "2026-03-15T22:00:00.000Z")).toBe(false);
  });

  test("returns true for different days", () => {
    expect(isDifferentDay("2026-03-15T10:00:00.000Z", "2026-03-16T10:00:00.000Z")).toBe(true);
  });

  test("returns true for same time different day", () => {
    expect(isDifferentDay("2026-03-14T12:00:00.000Z", "2026-03-15T12:00:00.000Z")).toBe(true);
  });

  test("returns false for identical timestamps", () => {
    expect(isDifferentDay("2026-03-15T14:30:00.000Z", "2026-03-15T14:30:00.000Z")).toBe(false);
  });

  test("handles month boundaries", () => {
    expect(isDifferentDay("2026-01-31T12:00:00.000Z", "2026-02-01T12:00:00.000Z")).toBe(true);
  });

  test("handles year boundaries", () => {
    expect(isDifferentDay("2025-12-31T12:00:00.000Z", "2026-01-01T12:00:00.000Z")).toBe(true);
  });
});
