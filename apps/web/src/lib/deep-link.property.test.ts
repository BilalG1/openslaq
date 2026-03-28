import { describe, test, expect } from "vitest";
import fc from "fast-check";
import { parseDeepLinkUrl, type DeepLinkIntent } from "./deep-link";

const slugArb = fc.stringMatching(/^[a-z0-9][a-z0-9-]{0,20}[a-z0-9]$/);
const idArb = fc.stringMatching(/^[a-z0-9_-]{2,20}$/);

describe("parseDeepLinkUrl property tests", () => {
  test("never throws on arbitrary string input", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 200 }), (input) => {
        const result = parseDeepLinkUrl(input);
        expect(result).toBeDefined();
        expect(["open", "channel", "dm", "thread"]).toContain(result.type);
      }),
      { numRuns: 500 },
    );
  });

  test("non-openslaq schemes always return open", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("http://", "https://", "ftp://", "slack://"),
        fc.stringMatching(/^[a-z0-9/]{0,30}$/),
        (scheme, path) => {
          const result = parseDeepLinkUrl(scheme + path);
          expect(result.type).toBe("open");
        },
      ),
    );
  });

  test("valid channel URLs parse correctly", () => {
    fc.assert(
      fc.property(slugArb, idArb, (slug, channelId) => {
        const url = `openslaq://w/${slug}/c/${channelId}`;
        const result = parseDeepLinkUrl(url);
        expect(result).toEqual({
          type: "channel",
          workspaceSlug: slug,
          channelId,
        });
      }),
    );
  });

  test("valid DM URLs parse correctly", () => {
    fc.assert(
      fc.property(slugArb, idArb, (slug, dmId) => {
        const url = `openslaq://w/${slug}/dm/${dmId}`;
        const result = parseDeepLinkUrl(url);
        expect(result).toEqual({
          type: "dm",
          workspaceSlug: slug,
          dmChannelId: dmId,
        });
      }),
    );
  });

  test("valid thread URLs parse correctly", () => {
    fc.assert(
      fc.property(slugArb, idArb, idArb, (slug, channelId, messageId) => {
        const url = `openslaq://w/${slug}/c/${channelId}/t/${messageId}`;
        const result = parseDeepLinkUrl(url);
        expect(result).toEqual({
          type: "thread",
          workspaceSlug: slug,
          channelId,
          messageId,
        });
      }),
    );
  });

  test("w/ with only a slug (no further segments) falls back to open", () => {
    fc.assert(
      fc.property(slugArb, (slug) => {
        const result = parseDeepLinkUrl(`openslaq://w/${slug}`);
        expect(result.type).toBe("open");
      }),
    );
  });

  test("result always has a valid DeepLinkIntent shape", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result: DeepLinkIntent = parseDeepLinkUrl(input);
        switch (result.type) {
          case "open":
            break;
          case "channel":
            expect(typeof result.workspaceSlug).toBe("string");
            expect(typeof result.channelId).toBe("string");
            break;
          case "dm":
            expect(typeof result.workspaceSlug).toBe("string");
            expect(typeof result.dmChannelId).toBe("string");
            break;
          case "thread":
            expect(typeof result.workspaceSlug).toBe("string");
            expect(typeof result.channelId).toBe("string");
            expect(typeof result.messageId).toBe("string");
            break;
        }
      }),
      { numRuns: 500 },
    );
  });
});
