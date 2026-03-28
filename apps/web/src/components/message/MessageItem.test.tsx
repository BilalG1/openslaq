import { describe, test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "../../test-utils";
import { MessageActionsProvider } from "./MessageActionsContext";
import { MessageItem } from "./MessageItem";
import { asMessageId, asChannelId, asUserId } from "@openslaq/shared";

function makeMessage(overrides: Partial<import("@openslaq/shared").Message> = {}): import("@openslaq/shared").Message {
  const now = "2026-01-01T12:00:00Z";
  return {
    id: asMessageId("msg-1"),
    channelId: asChannelId("ch-1"),
    userId: asUserId("user-2"),
    content: "Hello world",
    type: undefined,
    metadata: undefined,
    parentMessageId: null,
    createdAt: now,
    updatedAt: now,
    senderDisplayName: "Bob",
    senderAvatarUrl: null,
    reactions: [],
    replyCount: 0,
    latestReplyAt: null,
    isPinned: false,
    isBot: false,
    attachments: [],
    linkPreviews: [],
    mentions: [],
    sharedMessage: null,
    ...overrides,
  } as import("@openslaq/shared").Message;
}

function renderWithContext(msg: import("@openslaq/shared").Message) {
  return render(
    <MessageActionsProvider value={{ currentUserId: "user-1" }}>
      <MessageItem message={msg} />
    </MessageActionsProvider>,
  );
}

describe("MessageItem", () => {
  afterEach(cleanup);

  test("shows (edited) indicator when message was edited", () => {
    const msg = makeMessage({
      createdAt: "2026-01-01T12:00:00Z",
      updatedAt: "2026-01-01T12:05:00Z",
    });
    renderWithContext(msg);
    expect(screen.getByTestId("edited-indicator")).toBeTruthy();
    expect(screen.getByTestId("edited-indicator").textContent).toContain("edited");
  });

  test("does not show (edited) indicator when message was not edited", () => {
    const msg = makeMessage({
      createdAt: "2026-01-01T12:00:00Z",
      updatedAt: "2026-01-01T12:00:00Z",
    });
    renderWithContext(msg);
    expect(screen.queryByTestId("edited-indicator")).toBeNull();
  });
});
