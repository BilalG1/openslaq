import { describe, test, expect } from "bun:test";
import fc from "fast-check";
import {
  normalizeWorkspaceInfo,
  normalizeChannel,
  normalizeMessage,
  normalizeDmConversation,
  normalizeCursor,
} from "./normalize";

const isoDate = fc
  .integer({ min: 1_000_000_000_000, max: 1_900_000_000_000 })
  .map((ts) => new Date(ts).toISOString());

const idString = fc.stringMatching(/^[a-z0-9_-]{2,20}$/);

const rawWorkspace = fc.record({
  id: idString,
  name: fc.string({ minLength: 1, maxLength: 30 }),
  slug: fc.stringMatching(/^[a-z0-9-]{2,20}$/),
  createdAt: isoDate,
  role: fc.constantFrom("owner", "admin", "member"),
  memberCount: fc.option(fc.nat({ max: 1000 }), { nil: undefined }),
});

const rawChannel = fc.record({
  id: idString,
  workspaceId: idString,
  name: fc.stringMatching(/^[a-z0-9-]{2,20}$/),
  type: fc.constantFrom("public" as const, "private" as const),
  description: fc.option(fc.string({ maxLength: 50 }), { nil: null }),
  displayName: fc.option(fc.string({ maxLength: 30 }), { nil: undefined }),
  isArchived: fc.option(fc.boolean(), { nil: undefined }),
  createdBy: fc.option(idString, { nil: null }),
  createdAt: isoDate,
  memberCount: fc.option(fc.nat({ max: 1000 }), { nil: undefined }),
});

const rawMessage = fc.record({
  id: idString,
  channelId: idString,
  userId: idString,
  content: fc.string({ maxLength: 100 }),
  parentMessageId: fc.option(idString, { nil: null }),
  replyCount: fc.nat({ max: 100 }),
  latestReplyAt: fc.option(isoDate, { nil: null }),
  createdAt: isoDate,
  updatedAt: isoDate,
});

describe("normalize property tests", () => {
  describe("normalizeWorkspaceInfo", () => {
    test("preserves ID string values through type cast", () => {
      fc.assert(
        fc.property(rawWorkspace, (ws) => {
          const result = normalizeWorkspaceInfo(ws);
          expect(String(result.id)).toBe(ws.id);
          expect(result.name).toBe(ws.name);
          expect(result.slug).toBe(ws.slug);
          expect(result.createdAt).toBe(ws.createdAt);
        }),
      );
    });

    test("memberCount is preserved when present", () => {
      fc.assert(
        fc.property(rawWorkspace, (ws) => {
          const result = normalizeWorkspaceInfo(ws);
          expect(result.memberCount).toBe(ws.memberCount);
        }),
      );
    });
  });

  describe("normalizeChannel", () => {
    test("preserves ID string values through type cast", () => {
      fc.assert(
        fc.property(rawChannel, (ch) => {
          const result = normalizeChannel(ch);
          expect(String(result.id)).toBe(ch.id);
          expect(String(result.workspaceId)).toBe(ch.workspaceId);
          expect(result.name).toBe(ch.name);
          expect(result.type).toBe(ch.type);
        }),
      );
    });

    test("optional fields get sensible defaults", () => {
      fc.assert(
        fc.property(rawChannel, (ch) => {
          const result = normalizeChannel(ch);
          // displayName defaults to null
          expect(result.displayName).toBe(ch.displayName ?? null);
          // isArchived defaults to false
          expect(result.isArchived).toBe(ch.isArchived ?? false);
        }),
      );
    });

    test("createdBy is null-safe", () => {
      fc.assert(
        fc.property(rawChannel, (ch) => {
          const result = normalizeChannel(ch);
          if (ch.createdBy === null) {
            expect(result.createdBy).toBeNull();
          } else {
            expect(String(result.createdBy)).toBe(ch.createdBy);
          }
        }),
      );
    });
  });

  describe("normalizeMessage", () => {
    test("preserves ID string values", () => {
      fc.assert(
        fc.property(rawMessage, (msg) => {
          const result = normalizeMessage(msg);
          expect(String(result.id)).toBe(msg.id);
          expect(String(result.channelId)).toBe(msg.channelId);
          expect(String(result.userId)).toBe(msg.userId);
        }),
      );
    });

    test("parentMessageId is null-safe", () => {
      fc.assert(
        fc.property(rawMessage, (msg) => {
          const result = normalizeMessage(msg);
          if (msg.parentMessageId === null) {
            expect(result.parentMessageId).toBeNull();
          } else {
            expect(String(result.parentMessageId)).toBe(msg.parentMessageId);
          }
        }),
      );
    });

    test("missing arrays default to empty", () => {
      fc.assert(
        fc.property(rawMessage, (msg) => {
          const result = normalizeMessage(msg);
          expect(Array.isArray(result.attachments)).toBe(true);
          expect(Array.isArray(result.reactions)).toBe(true);
          expect(Array.isArray(result.mentions)).toBe(true);
        }),
      );
    });
  });

  describe("normalizeDmConversation", () => {
    test("preserves channel and otherUser data", () => {
      fc.assert(
        fc.property(
          rawChannel,
          fc.record({
            id: idString,
            displayName: fc.string({ minLength: 1, maxLength: 20 }),
            avatarUrl: fc.option(fc.stringMatching(/^https:\/\/[a-z.]+$/), { nil: null }),
          }),
          (channel, otherUser) => {
            const result = normalizeDmConversation({ channel, otherUser });
            expect(String(result.channel.id)).toBe(channel.id);
            expect(result.otherUser.id).toBe(otherUser.id);
            expect(result.otherUser.displayName).toBe(otherUser.displayName);
          },
        ),
      );
    });
  });

  describe("normalizeCursor", () => {
    test("null and undefined become null, strings pass through", () => {
      fc.assert(
        fc.property(
          fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
          (cursor) => {
            const result = normalizeCursor(cursor);
            if (cursor === undefined) {
              expect(result).toBeNull();
            } else {
              expect(result).toBe(cursor);
            }
          },
        ),
      );
    });
  });
});
