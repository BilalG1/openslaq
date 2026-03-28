import { describe, test, expect } from "bun:test";
import fc from "fast-check";
import {
  isCustomEmojiShortcode,
  parseCustomEmojiName,
  buildCustomEmojiShortcode,
  findCustomEmoji,
} from "./emoji-utils";

// Arbitrary for valid custom emoji names: [a-z0-9][a-z0-9_-]*[a-z0-9] (min length 2)
const validEmojiName = fc
  .stringMatching(/^[a-z0-9][a-z0-9_-]{0,20}[a-z0-9]$/);

describe("emoji-utils property tests", () => {
  test("round-trip: parse(build(name)) === name for valid names", () => {
    fc.assert(
      fc.property(validEmojiName, (name) => {
        const shortcode = buildCustomEmojiShortcode(name);
        expect(parseCustomEmojiName(shortcode)).toBe(name);
      }),
    );
  });

  test("isCustomEmojiShortcode returns true for any built shortcode", () => {
    fc.assert(
      fc.property(validEmojiName, (name) => {
        expect(isCustomEmojiShortcode(buildCustomEmojiShortcode(name))).toBe(true);
      }),
    );
  });

  test("isCustomEmojiShortcode returns false for random strings", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 50 }), (s) => {
        // Only strings matching the exact pattern should return true
        if (!s.startsWith(":custom:") || !s.endsWith(":")) {
          expect(isCustomEmojiShortcode(s)).toBe(false);
        }
      }),
    );
  });

  test("parseCustomEmojiName returns null for invalid shortcodes", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 50 }), (s) => {
        const result = parseCustomEmojiName(s);
        // Result is either null or a valid name
        if (result !== null) {
          expect(isCustomEmojiShortcode(s)).toBe(true);
        }
      }),
    );
  });

  test("findCustomEmoji returns matching emoji or undefined", () => {
    fc.assert(
      fc.property(
        validEmojiName,
        fc.array(validEmojiName, { minLength: 0, maxLength: 10 }),
        (searchName, emojiNames) => {
          const emojis = emojiNames.map((name) => ({
            id: name,
            name,
            url: `https://example.com/${name}.png`,
            workspaceId: "ws1",
            uploadedBy: "user1",
            createdAt: new Date().toISOString(),
          }));
          const result = findCustomEmoji(searchName, emojis as unknown as Parameters<typeof findCustomEmoji>[1]);
          if (emojiNames.includes(searchName)) {
            expect(result).toBeDefined();
            expect(result!.name).toBe(searchName);
          } else {
            expect(result).toBeUndefined();
          }
        },
      ),
    );
  });
});
