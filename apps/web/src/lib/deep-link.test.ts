import { describe, expect, test } from "vitest";
import { parseDeepLinkUrl } from "./deep-link";

describe("parseDeepLinkUrl", () => {
  test("parses openslaq://open", () => {
    expect(parseDeepLinkUrl("openslaq://open")).toEqual({ type: "open" });
  });

  test("parses empty path as open", () => {
    expect(parseDeepLinkUrl("openslaq://")).toEqual({ type: "open" });
  });

  test("parses channel URL", () => {
    expect(parseDeepLinkUrl("openslaq://w/default/c/ch_123")).toEqual({
      type: "channel",
      workspaceSlug: "default",
      channelId: "ch_123",
    });
  });

  test("parses DM URL", () => {
    expect(parseDeepLinkUrl("openslaq://w/my-team/dm/dm_456")).toEqual({
      type: "dm",
      workspaceSlug: "my-team",
      dmChannelId: "dm_456",
    });
  });

  test("parses thread URL", () => {
    expect(parseDeepLinkUrl("openslaq://w/default/c/ch_123/t/msg_789")).toEqual({
      type: "thread",
      workspaceSlug: "default",
      channelId: "ch_123",
      messageId: "msg_789",
    });
  });

  test("parses invite URL", () => {
    expect(parseDeepLinkUrl("openslaq://invite/abc123")).toEqual({
      type: "invite",
      code: "abc123",
    });
  });

  test("parses invite URL with trailing slash", () => {
    expect(parseDeepLinkUrl("openslaq://invite/abc123/")).toEqual({
      type: "invite",
      code: "abc123",
    });
  });

  test("falls back to open for invite with no code", () => {
    expect(parseDeepLinkUrl("openslaq://invite/")).toEqual({ type: "open" });
  });

  test("falls back to open for unrecognized paths", () => {
    expect(parseDeepLinkUrl("openslaq://some/random/path")).toEqual({ type: "open" });
  });

  test("falls back to open for unknown segments under w/", () => {
    expect(parseDeepLinkUrl("openslaq://w/default/unknown/thing")).toEqual({ type: "open" });
  });

  test("handles trailing slashes", () => {
    expect(parseDeepLinkUrl("openslaq://w/default/c/ch_123/")).toEqual({
      type: "channel",
      workspaceSlug: "default",
      channelId: "ch_123",
    });
  });

  test("handles w/ with no slug gracefully", () => {
    expect(parseDeepLinkUrl("openslaq://w/")).toEqual({ type: "open" });
  });
});
