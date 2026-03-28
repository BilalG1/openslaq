import fc from "fast-check";
import { formatTime, formatRelativeTime } from "../time";

// Generate valid ISO strings from timestamps (fc.date can produce invalid Date in some versions)
const isoArb = fc
  .integer({
    min: new Date("2020-01-01").getTime(),
    max: new Date("2030-01-01").getTime(),
  })
  .map((ts) => new Date(ts).toISOString());

describe("formatTime property tests", () => {
  test("never throws on valid ISO strings", () => {
    fc.assert(
      fc.property(isoArb, (iso) => {
        expect(() => formatTime(iso)).not.toThrow();
      }),
      { numRuns: 200 },
    );
  });

  test("result matches time pattern with AM/PM", () => {
    fc.assert(
      fc.property(isoArb, (iso) => {
        const result = formatTime(iso);
        expect(result).toMatch(/\d{1,2}:\d{2}\s[AP]M/);
      }),
      { numRuns: 200 },
    );
  });
});

describe("formatRelativeTime property tests", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-17T12:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("never throws on valid ISO strings", () => {
    fc.assert(
      fc.property(isoArb, (iso) => {
        expect(() => formatRelativeTime(iso)).not.toThrow();
      }),
      { numRuns: 200 },
    );
  });

  test('returns "now" for timestamps within last 59 seconds', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 59 }), (secsAgo) => {
        const d = new Date("2026-03-17T12:00:00Z");
        d.setSeconds(d.getSeconds() - secsAgo);
        expect(formatRelativeTime(d.toISOString())).toBe("now");
      }),
      { numRuns: 60 },
    );
  });

  test("returns minutes for 1-59 minutes ago", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 59 }), (minsAgo) => {
        const d = new Date("2026-03-17T12:00:00Z");
        d.setMinutes(d.getMinutes() - minsAgo);
        const result = formatRelativeTime(d.toISOString());
        expect(result).toMatch(/^\d+m$/);
      }),
      { numRuns: 59 },
    );
  });

  test("returns hours for 1-23 hours ago", () => {
    fc.assert(
      fc.property(fc.integer({ min: 60, max: 60 * 23 + 59 }), (minsAgo) => {
        const d = new Date("2026-03-17T12:00:00Z");
        d.setMinutes(d.getMinutes() - minsAgo);
        const result = formatRelativeTime(d.toISOString());
        expect(result).toMatch(/^\d+h$/);
      }),
      { numRuns: 100 },
    );
  });

  test("returns days for 1-29 days ago", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 29 }), (daysAgo) => {
        const d = new Date("2026-03-17T12:00:00Z");
        d.setDate(d.getDate() - daysAgo);
        const result = formatRelativeTime(d.toISOString());
        expect(result).toMatch(/^\d+d$/);
      }),
      { numRuns: 29 },
    );
  });

  test("monotonicity: older timestamps produce equal or larger relative values", () => {
    // Compare numeric value extracted from relative time strings
    function relativeToMinutes(rel: string): number {
      if (rel === "now") return 0;
      const num = parseInt(rel);
      if (rel.endsWith("m")) return num;
      if (rel.endsWith("h")) return num * 60;
      if (rel.endsWith("d")) return num * 60 * 24;
      return Infinity; // locale date (very old)
    }

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 60 * 24 * 35 }),
        fc.integer({ min: 0, max: 60 * 24 * 35 }),
        (minsAgo1, minsAgo2) => {
          const now = new Date("2026-03-17T12:00:00Z");
          const d1 = new Date(now.getTime() - minsAgo1 * 60000);
          const d2 = new Date(now.getTime() - minsAgo2 * 60000);
          const r1 = relativeToMinutes(formatRelativeTime(d1.toISOString()));
          const r2 = relativeToMinutes(formatRelativeTime(d2.toISOString()));
          if (minsAgo1 >= minsAgo2) {
            expect(r1).toBeGreaterThanOrEqual(r2);
          } else {
            expect(r2).toBeGreaterThanOrEqual(r1);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
