import { describe, test, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "../../test-utils";
vi.mock("../message/MessageItem", () => ({
  MessageItem: ({ message }: { message: { id: string } }) => <div data-testid={`msg-${message.id}`} />,
}));
vi.mock("../message/MessageActionsContext", () => ({
  MessageActionsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("../ui", () => ({
  EmptyState: () => null,
  LoadingState: () => null,
  ErrorState: () => null,
}));

const mockDms = [
  {
    channel: { id: "dm-ch-1", name: "dm:user-1:user-2" },
    otherUser: { id: "user-2", displayName: "Alice Smith", avatarUrl: null },
    lastMessageContent: null,
    lastMessageAt: null,
  },
];

vi.mock("../../state/chat-store", () => ({
  useChatStore: () => ({
    state: { dms: mockDms },
    dispatch: () => {},
  }),
}));

const mockUnreadsData = {
  channels: [
    {
      channelId: "dm-ch-1",
      channelName: "dm:user-1:user-2",
      channelType: "dm" as const,
      messages: [{ id: "msg-1", content: "Hello", channelId: "dm-ch-1", userId: "user-2", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", type: null, metadata: null, parentMessageId: null, user: { id: "user-2", displayName: "Alice Smith", avatarUrl: null } }],
    },
    {
      channelId: "ch-general",
      channelName: "general",
      channelType: "public" as const,
      messages: [{ id: "msg-2", content: "Hi", channelId: "ch-general", userId: "user-3", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", type: null, metadata: null, parentMessageId: null, user: { id: "user-3", displayName: "Bob", avatarUrl: null } }],
    },
  ],
  threadMentions: [],
};

vi.mock("../../hooks/chat/useAllUnreads", () => ({
  useAllUnreads: () => ({
    data: mockUnreadsData,
    loading: false,
    error: null,
    markChannelRead: vi.fn(),
    markAllRead: vi.fn(),
  }),
}));

import { AllUnreadsView } from "./AllUnreadsView";

describe("AllUnreadsView", () => {
  afterEach(cleanup);
  test("displays user display name for DM channels instead of raw channel ID", () => {
    render(
      <AllUnreadsView
        workspaceSlug="default"
        currentUserId="user-1"
        onNavigateToChannel={() => {}}
        onOpenThread={() => {}}
        onOpenProfile={() => {}}
      />,
    );

    const dmGroup = screen.getByTestId("unread-group-dm-ch-1");
    expect(dmGroup.textContent).toContain("Alice Smith");
    expect(dmGroup.textContent).not.toContain("dm:");
  });

  test("displays channel name with # prefix for regular channels", () => {
    render(
      <AllUnreadsView
        workspaceSlug="default"
        currentUserId="user-1"
        onNavigateToChannel={() => {}}
        onOpenThread={() => {}}
        onOpenProfile={() => {}}
      />,
    );

    const channelGroup = screen.getByTestId("unread-group-ch-general");
    expect(channelGroup.textContent).toContain("# general");
  });
});
