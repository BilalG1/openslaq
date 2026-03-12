import { describe, test, expect } from "bun:test";
import { parseRemindTime } from "../../api/src/commands/time-parser";

describe("parseRemindTime", () => {
  const tolerance = 2000; // 2s tolerance for timing

  function expectClose(result: Date | null, expected: Date) {
    expect(result).not.toBeNull();
    expect(Math.abs(result!.getTime() - expected.getTime())).toBeLessThan(tolerance);
  }

  describe("in N minutes/hours/days", () => {
    test("in 30 minutes", () => {
      const expected = new Date();
      expected.setMinutes(expected.getMinutes() + 30);
      expectClose(parseRemindTime("in 30 minutes"), expected);
    });

    test("in 1 min", () => {
      const expected = new Date();
      expected.setMinutes(expected.getMinutes() + 1);
      expectClose(parseRemindTime("in 1 min"), expected);
    });

    test("in 5 mins", () => {
      const expected = new Date();
      expected.setMinutes(expected.getMinutes() + 5);
      expectClose(parseRemindTime("in 5 mins"), expected);
    });

    test("in 2 hours", () => {
      const expected = new Date();
      expected.setHours(expected.getHours() + 2);
      expectClose(parseRemindTime("in 2 hours"), expected);
    });

    test("in 1 hr", () => {
      const expected = new Date();
      expected.setHours(expected.getHours() + 1);
      expectClose(parseRemindTime("in 1 hr"), expected);
    });

    test("in 3 hrs", () => {
      const expected = new Date();
      expected.setHours(expected.getHours() + 3);
      expectClose(parseRemindTime("in 3 hrs"), expected);
    });

    test("in 3 days", () => {
      const expected = new Date();
      expected.setDate(expected.getDate() + 3);
      expectClose(parseRemindTime("in 3 days"), expected);
    });

    test("in 1 day", () => {
      const expected = new Date();
      expected.setDate(expected.getDate() + 1);
      expectClose(parseRemindTime("in 1 day"), expected);
    });

    test("in 1 minute", () => {
      const expected = new Date();
      expected.setMinutes(expected.getMinutes() + 1);
      expectClose(parseRemindTime("in 1 minute"), expected);
    });

    test("in 1 hour", () => {
      const expected = new Date();
      expected.setHours(expected.getHours() + 1);
      expectClose(parseRemindTime("in 1 hour"), expected);
    });
  });

  describe("tomorrow", () => {
    test("tomorrow at 14:30", () => {
      const expected = new Date();
      expected.setDate(expected.getDate() + 1);
      expected.setHours(14, 30, 0, 0);
      const result = parseRemindTime("tomorrow at 14:30");
      expect(result).not.toBeNull();
      expect(result!.getHours()).toBe(14);
      expect(result!.getMinutes()).toBe(30);
      expect(result!.getDate()).toBe(expected.getDate());
    });

    test("tomorrow at 9:00", () => {
      const expected = new Date();
      expected.setDate(expected.getDate() + 1);
      expected.setHours(9, 0, 0, 0);
      const result = parseRemindTime("tomorrow at 9:00");
      expect(result).not.toBeNull();
      expect(result!.getHours()).toBe(9);
      expect(result!.getMinutes()).toBe(0);
    });

    test("tomorrow defaults to 9:00 AM", () => {
      const result = parseRemindTime("tomorrow");
      expect(result).not.toBeNull();
      const expected = new Date();
      expected.setDate(expected.getDate() + 1);
      expect(result!.getDate()).toBe(expected.getDate());
      expect(result!.getHours()).toBe(9);
      expect(result!.getMinutes()).toBe(0);
    });
  });

  describe("at HH:MM", () => {
    test("at future time today stays today", () => {
      // Use 23:59 which is almost certainly in the future
      const result = parseRemindTime("at 23:59");
      expect(result).not.toBeNull();
      expect(result!.getHours()).toBe(23);
      expect(result!.getMinutes()).toBe(59);
    });

    test("at past time rolls to tomorrow", () => {
      // Use 00:00 which is almost certainly in the past
      const result = parseRemindTime("at 0:00");
      expect(result).not.toBeNull();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(result!.getDate()).toBe(tomorrow.getDate());
      expect(result!.getHours()).toBe(0);
      expect(result!.getMinutes()).toBe(0);
    });
  });

  describe("next <day>", () => {
    test("next monday", () => {
      const result = parseRemindTime("next monday");
      expect(result).not.toBeNull();
      expect(result!.getDay()).toBe(1);
      expect(result!.getHours()).toBe(9);
      expect(result!.getMinutes()).toBe(0);
      // Should be 1-7 days in the future
      const diffDays = (result!.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(0);
      expect(diffDays).toBeLessThanOrEqual(7);
    });

    test("next sunday", () => {
      const result = parseRemindTime("next sunday");
      expect(result).not.toBeNull();
      expect(result!.getDay()).toBe(0);
      expect(result!.getHours()).toBe(9);
    });

    test("next friday", () => {
      const result = parseRemindTime("next friday");
      expect(result).not.toBeNull();
      expect(result!.getDay()).toBe(5);
    });

    test("next wednesday", () => {
      const result = parseRemindTime("next wednesday");
      expect(result).not.toBeNull();
      expect(result!.getDay()).toBe(3);
    });
  });

  describe("invalid inputs", () => {
    test("gibberish returns null", () => {
      expect(parseRemindTime("gibberish")).toBeNull();
    });

    test("empty string returns null", () => {
      expect(parseRemindTime("")).toBeNull();
    });

    test("next nonday returns null", () => {
      expect(parseRemindTime("next nonday")).toBeNull();
    });

    test("random text returns null", () => {
      expect(parseRemindTime("do the laundry")).toBeNull();
    });
  });
});
