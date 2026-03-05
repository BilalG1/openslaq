import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup } from "../../test-utils";
import { SharedMessageBlock } from "./SharedMessageBlock";
import type { SharedMessageInfo } from "@openslaq/shared";
import { asMessageId, asChannelId, asUserId } from "@openslaq/shared";

afterEach(cleanup);

function makeSharedMessage(overrides: Partial<SharedMessageInfo> = {}): SharedMessageInfo {
  return {
    id: asMessageId("shared-1"),
    channelId: asChannelId("ch-1"),
    channelName: "general",
    channelType: "public",
    userId: asUserId("user-1"),
    senderDisplayName: "Alice",
    senderAvatarUrl: null,
    content: "Hello world",
    createdAt: "2025-01-01T14:30:00Z",
    ...overrides,
  };
}

describe("SharedMessageBlock", () => {
  it("renders public channel name with # prefix", () => {
    render(<SharedMessageBlock sharedMessage={makeSharedMessage()} />);

    expect(screen.getByText(/in #general/)).toBeTruthy();
  });

  it("renders private channel name with # prefix", () => {
    render(
      <SharedMessageBlock
        sharedMessage={makeSharedMessage({ channelType: "private", channelName: "secret" })}
      />,
    );

    expect(screen.getByText(/in #secret/)).toBeTruthy();
  });

  it("renders DM channel name without # prefix", () => {
    render(
      <SharedMessageBlock
        sharedMessage={makeSharedMessage({ channelType: "dm", channelName: "a direct message" })}
      />,
    );

    expect(screen.getByText(/in a direct message/)).toBeTruthy();
    expect(screen.queryByText(/#/)).toBeNull();
  });

  it("renders group DM channel name without # prefix", () => {
    render(
      <SharedMessageBlock
        sharedMessage={makeSharedMessage({ channelType: "group_dm", channelName: "Alice, Bob" })}
      />,
    );

    expect(screen.getByText(/in Alice, Bob/)).toBeTruthy();
    expect(screen.queryByText(/#/)).toBeNull();
  });

  it("renders sender name and message content", () => {
    render(<SharedMessageBlock sharedMessage={makeSharedMessage()} />);

    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByTestId("shared-message-block")).toBeTruthy();
  });
});
