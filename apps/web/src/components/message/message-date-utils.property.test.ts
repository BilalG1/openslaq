import { describe, test, expect } from "vitest";
import fc from "fast-check";
import { getMessageDateKey, isDifferentDay } from "./message-date-utils";

const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Arbitrary for valid ISO date strings (use integer timestamps to avoid Invalid Date)
const isoDateString = fc
  .integer({ min: 0, max: new Date("2099-12-31").getTime() })
  .map((ts) => new Date(ts).toISOString());

describe("message-date-utils property tests", () => {
  test("getMessageDateKey always returns YYYY-MM-DD format", () => {
    fc.assert(
      fc.property(isoDateString, (dateStr) => {
        const key = getMessageDateKey(dateStr);
        expect(key).toMatch(DATE_KEY_REGEX);
      }),
    );
  });

  test("getMessageDateKey is deterministic", () => {
    fc.assert(
      fc.property(isoDateString, (dateStr) => {
        expect(getMessageDateKey(dateStr)).toBe(getMessageDateKey(dateStr));
      }),
    );
  });

  test("getMessageDateKey produces valid month (01-12) and day (01-31)", () => {
    fc.assert(
      fc.property(isoDateString, (dateStr) => {
        const key = getMessageDateKey(dateStr);
        const [, month, day] = key.split("-").map(Number);
        expect(month).toBeGreaterThanOrEqual(1);
        expect(month).toBeLessThanOrEqual(12);
        expect(day).toBeGreaterThanOrEqual(1);
        expect(day).toBeLessThanOrEqual(31);
      }),
    );
  });

  test("isDifferentDay is reflexive (same input = same day)", () => {
    fc.assert(
      fc.property(isoDateString, (dateStr) => {
        expect(isDifferentDay(dateStr, dateStr)).toBe(false);
      }),
    );
  });

  test("isDifferentDay is symmetric", () => {
    fc.assert(
      fc.property(isoDateString, isoDateString, (a, b) => {
        expect(isDifferentDay(a, b)).toBe(isDifferentDay(b, a));
      }),
    );
  });

  test("isDifferentDay is consistent with getMessageDateKey", () => {
    fc.assert(
      fc.property(isoDateString, isoDateString, (a, b) => {
        const sameKey = getMessageDateKey(a) === getMessageDateKey(b);
        expect(isDifferentDay(a, b)).toBe(!sameKey);
      }),
    );
  });
});
