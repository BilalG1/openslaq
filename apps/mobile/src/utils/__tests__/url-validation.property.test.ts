import fc from "fast-check";
import { isSafeUrl } from "../url-validation";

jest.mock("react-native", () => ({
  Linking: { openURL: jest.fn(() => Promise.resolve()) },
}));

const domainArb = fc.stringMatching(/^[a-z]{3,12}\.[a-z]{2,4}$/);
const pathArb = fc.stringMatching(/^\/[a-z0-9/]{0,20}$/);

describe("isSafeUrl property tests", () => {
  test("never throws on arbitrary strings", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 200 }), (input) => {
        expect(() => isSafeUrl(input)).not.toThrow();
      }),
      { numRuns: 500 },
    );
  });

  test("returns true for http URLs", () => {
    fc.assert(
      fc.property(domainArb, pathArb, (domain, path) => {
        expect(isSafeUrl(`http://${domain}${path}`)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  test("returns true for https URLs", () => {
    fc.assert(
      fc.property(domainArb, pathArb, (domain, path) => {
        expect(isSafeUrl(`https://${domain}${path}`)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  test("returns true for mailto URLs", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z]{3,10}@[a-z]{3,10}\.[a-z]{2,4}$/),
        (email) => {
          expect(isSafeUrl(`mailto:${email}`)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("rejects javascript: protocol", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 50 }), (payload) => {
        expect(isSafeUrl(`javascript:${payload}`)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  test("rejects data: protocol", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 50 }), (payload) => {
        expect(isSafeUrl(`data:${payload}`)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  test("rejects file: protocol", () => {
    fc.assert(
      fc.property(pathArb, (path) => {
        expect(isSafeUrl(`file://${path}`)).toBe(false);
      }),
      { numRuns: 50 },
    );
  });

  test("returns false for non-URL strings", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z ]{1,30}$/),
        (str) => {
          expect(isSafeUrl(str)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
