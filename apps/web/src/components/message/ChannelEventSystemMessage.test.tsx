import { describe, test, expect, afterEach } from "bun:test";
import { render, screen, cleanup } from "../../test-utils";
import { ChannelEventSystemMessage } from "./ChannelEventSystemMessage";
import type { ChannelEventMessage } from "@openslaq/shared";
import { asMessageId, asChannelId, asUserId } from "@openslaq/shared";

const makeMessage = (action: "joined" | "left", senderDisplayName = "Alice"): ChannelEventMessage => ({
  id: asMessageId("msg-1"),
  channelId: asChannelId("ch-1"),
  userId: asUserId("user-1"),
  content: "",
  parentMessageId: null,
  replyCount: 0,
  latestReplyAt: null,
  attachments: [],
  reactions: [],
  mentions: [],
  senderDisplayName,
  senderAvatarUrl: null,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
  type: "channel_event",
  metadata: { action },
});

describe("ChannelEventSystemMessage", () => {
  afterEach(cleanup);

  test("renders joined message", () => {
    render(<ChannelEventSystemMessage message={makeMessage("joined")} />);
    const el = screen.getByTestId("channel-event-system-message");
    expect(el.textContent).toContain("Alice");
    expect(el.textContent).toContain("joined the channel");
  });

  test("renders left message", () => {
    render(<ChannelEventSystemMessage message={makeMessage("left")} />);
    const el = screen.getByTestId("channel-event-system-message");
    expect(el.textContent).toContain("Alice");
    expect(el.textContent).toContain("left the channel");
  });

  test("falls back to userId when no displayName", () => {
    const msg = makeMessage("joined");
    msg.senderDisplayName = undefined;
    render(<ChannelEventSystemMessage message={msg} />);
    const el = screen.getByTestId("channel-event-system-message");
    expect(el.textContent).toContain(String(msg.userId));
  });
});
