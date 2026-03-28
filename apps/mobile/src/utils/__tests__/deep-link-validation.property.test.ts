import fc from "fast-check";
import { isValidSlug, isValidId } from "../deep-link-validation";

const validSlugArb = fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,20}$/);
const uuidV4Arb = fc
  .tuple(
    fc.stringMatching(/^[0-9a-f]{8}$/),
    fc.stringMatching(/^[0-9a-f]{4}$/),
    fc.stringMatching(/^4[0-9a-f]{3}$/),
    fc.constantFrom("8", "9", "a", "b").chain((prefix) =>
      fc.stringMatching(/^[0-9a-f]{3}$/).map((rest) => prefix + rest),
    ),
    fc.stringMatching(/^[0-9a-f]{12}$/),
  )
  .map(([a, b, c, d, e]) => `${a}-${b}-${c}-${d}-${e}`);

describe("isValidSlug property tests", () => {
  test("never throws on arbitrary strings", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 200 }), (input) => {
        expect(() => isValidSlug(input)).not.toThrow();
      }),
      { numRuns: 500 },
    );
  });

  test("returns true for all generated valid slugs", () => {
    fc.assert(
      fc.property(validSlugArb, (slug) => {
        expect(isValidSlug(slug)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  test("rejects empty strings", () => {
    expect(isValidSlug("")).toBe(false);
  });

  test("rejects strings starting with dash or underscore", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("-", "_"),
        fc.stringMatching(/^[a-zA-Z0-9_-]{0,20}$/),
        (prefix, rest) => {
          expect(isValidSlug(prefix + rest)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("rejects strings longer than 63 characters", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z0-9]{64,100}$/),
        (long) => {
          expect(isValidSlug(long)).toBe(false);
        },
      ),
      { numRuns: 50 },
    );
  });
});

describe("isValidId property tests", () => {
  test("never throws on arbitrary strings", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 200 }), (input) => {
        expect(() => isValidId(input)).not.toThrow();
      }),
      { numRuns: 500 },
    );
  });

  test("returns true for valid UUID v4", () => {
    fc.assert(
      fc.property(uuidV4Arb, (uuid) => {
        expect(isValidId(uuid)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  test("rejects non-UUID strings", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z]{5,20}$/),
        (str) => {
          expect(isValidId(str)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
