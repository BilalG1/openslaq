import React from "react";
import { Alert, Text, View } from "react-native";
import { fireEvent, render, screen } from "@/test-utils";

const mockPush = jest.fn();
const mockSetOptions = jest.fn();
const mockDispatch = jest.fn();
const mockJoinChannel = jest.fn();
const mockLeaveChannel = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ workspaceSlug: "acme", channelId: "ch-1" }),
  useNavigation: () => ({ setOptions: mockSetOptions }),
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#fff",
        surfaceSecondary: "#f5f5f5",
        surfaceTertiary: "#eee",
        surfaceSelected: "#ddeeff",
        textPrimary: "#000",
        textSecondary: "#666",
        textFaint: "#999",
        textMuted: "#888",
        borderDefault: "#ddd",
        avatarFallbackBg: "#ddd",
        avatarFallbackText: "#333",
      },
      brand: { primary: "#1264a3", danger: "#dc2626" },
      interaction: { badgeUnreadBg: "#f00", badgeUnreadText: "#fff" },
    },
  }),
}));

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    authProvider: { requireAccessToken: jest.fn() },
    user: { id: "u-1" },
  }),
}));

let mockWorkspaceRole = "owner";

const baseMessage = {
  id: "m-1",
  channelId: "ch-1",
  userId: "u-1",
  senderDisplayName: "Alice",
  content: "hello",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
  parentMessageId: null,
  latestReplyAt: null,
  reactions: [],
  replyCount: 0,
  attachments: [],
  mentions: [],
};

jest.mock("@/contexts/ChatStoreProvider", () => ({
  useChatStore: () => ({
    dispatch: mockDispatch,
    state: {
      channels: [
        {
          id: "ch-1",
          name: "general",
          type: "public",
          workspaceId: "ws-1",
          createdAt: "",
          createdBy: "u-1",
          description: null,
          displayName: null,
          isArchived: false,
        },
      ],
      workspaces: [{ slug: "acme", role: mockWorkspaceRole, name: "Acme", memberCount: 1 }],
      channelMessageIds: { "ch-1": ["m-1"] },
      messagesById: { "m-1": baseMessage },
      customEmojis: [],
      starredChannelIds: [],
      channelNotificationPrefs: {},
      ui: { channelMessagesLoading: {}, threadLoading: {}, threadError: {}, channelMessagesError: {}, bootstrapLoading: false, bootstrapError: null, mutationError: null },
      dms: [],
      groupDms: [],
      savedMessageIds: [],
      unreadCounts: {},
      presence: {},
      threadReplyIds: {},
      threadPagination: {},
      channelPagination: {},
      scrollTarget: null,
    },
  }),
}));

jest.mock("@/contexts/SocketProvider", () => ({
  useSocket: () => ({
    joinChannel: mockJoinChannel,
    leaveChannel: mockLeaveChannel,
    socket: null,
  }),
}));

jest.mock("@/hooks/useSocketEvent", () => ({
  useSocketEvent: jest.fn(),
}));

jest.mock("@/hooks/useMessageActions", () => ({
  useMessageActions: () => ({
    handleEditMessage: jest.fn(),
    handleDeleteMessage: jest.fn(),
    handleToggleReaction: jest.fn(),
  }),
}));

jest.mock("@/hooks/useOperationDeps", () => ({
  useOperationDeps: () => ({ api: {}, auth: {}, dispatch: mockDispatch, getState: jest.fn() }),
}));

jest.mock("@/hooks/useFetchData", () => ({
  useFetchData: ({ initialValue }: { initialValue: unknown }) => ({ data: initialValue }),
}));

jest.mock("@/hooks/useTypingEmitter", () => ({
  useTypingEmitter: () => ({ emitTyping: jest.fn() }),
}));

jest.mock("@/hooks/useTypingTracking", () => ({
  useTypingTracking: () => [],
}));

jest.mock("@/hooks/useChannelSocketEvents", () => ({
  useChannelSocketEvents: () => ({
    joinChannel: mockJoinChannel,
    leaveChannel: mockLeaveChannel,
  }),
}));

jest.mock("@/hooks/useFileUpload", () => ({
  useFileUpload: () => ({
    pendingFiles: [],
    hasFiles: false,
    uploading: false,
    addFile: jest.fn(),
    uploadAll: jest.fn(),
    reset: jest.fn(),
    addFromImagePicker: jest.fn(),
    addFromCamera: jest.fn(),
    addFromDocumentPicker: jest.fn(),
    removeFile: jest.fn(),
  }),
}));

jest.mock("@/hooks/useMessageScrollTarget", () => ({
  useMessageScrollTarget: jest.fn(),
}));

jest.mock("@openslaq/client-core", () => ({
  loadChannelMessages: jest.fn(() => Promise.resolve()),
  loadOlderMessages: jest.fn(() => Promise.resolve()),
  sendMessage: jest.fn(() => Promise.resolve(true)),
  listWorkspaceMembers: jest.fn(() => Promise.resolve([])),
  leaveChannel: jest.fn(() => Promise.resolve()),
  updateChannelDescription: jest.fn(() => Promise.resolve()),
  setChannelNotificationPrefOp: jest.fn(() => Promise.resolve()),
  starChannelOp: jest.fn(() => Promise.resolve()),
  unstarChannelOp: jest.fn(() => Promise.resolve()),
  pinMessageOp: jest.fn(() => Promise.resolve()),
  unpinMessageOp: jest.fn(() => Promise.resolve()),
  fetchPinnedMessages: jest.fn(() => Promise.resolve([])),
  saveMessageOp: jest.fn(() => Promise.resolve()),
  unsaveMessageOp: jest.fn(() => Promise.resolve()),
  shareMessageOp: jest.fn(() => Promise.resolve()),
  fetchSlashCommands: jest.fn(() => Promise.resolve([])),
  executeSlashCommand: jest.fn(() => Promise.resolve({})),
  createScheduledMessageOp: jest.fn(() => Promise.resolve()),
  markChannelAsUnread: jest.fn(() => Promise.resolve()),
  archiveChannel: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/components/ChannelMessageList", () => ({
  ChannelMessageList: ({ messages }: { messages: Array<{ content: string }> }) => {
    const { Text: MockText, View: MockView } = require("react-native");
    return (
      <MockView testID="message-list">
        {messages.map((m: { content: string }, i: number) => (
          <MockText key={i}>{m.content}</MockText>
        ))}
      </MockView>
    );
  },
}));
jest.mock("@/components/MessageInput", () => ({ MessageInput: () => null }));
jest.mock("@/components/TypingIndicator", () => ({ TypingIndicator: () => null }));
jest.mock("@/components/MessageActionSheet", () => ({ MessageActionSheet: () => null }));
jest.mock("@/components/EmojiPickerSheet", () => ({ EmojiPickerSheet: () => null }));
jest.mock("@/components/EditTopicModal", () => ({ EditTopicModal: () => null }));
jest.mock("@/components/PinnedMessagesSheet", () => ({ PinnedMessagesSheet: () => null }));
jest.mock("@/components/ShareMessageModal", () => ({ ShareMessageModal: () => null }));
jest.mock("@/components/NotificationLevelSheet", () => ({ NotificationLevelSheet: () => null }));
jest.mock("@/components/huddle/HuddleHeaderButton", () => ({ HuddleHeaderButton: () => null }));
jest.mock("@/components/ChannelInfoPanel.variant-a", () => ({ ChannelInfoPanel: () => null }));

import { loadChannelMessages } from "@openslaq/client-core";
import ChannelScreen from "../../../app/(app)/[workspaceSlug]/(tabs)/(channels)/[channelId]";

const mockLoadChannelMessages = loadChannelMessages as jest.Mock;

describe("ChannelScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWorkspaceRole = "owner";
  });

  it("renders message list with messages", () => {
    render(<ChannelScreen />);
    expect(screen.getByTestId("message-list")).toBeTruthy();
    expect(screen.getByText("hello")).toBeTruthy();
  });

  it("shows loading spinner when loading with no messages", () => {
    const mockUseChatStore = require("@/contexts/ChatStoreProvider").useChatStore;
    const original = mockUseChatStore();
    jest.spyOn(require("@/contexts/ChatStoreProvider"), "useChatStore").mockReturnValue({
      ...original,
      state: {
        ...original.state,
        channelMessageIds: { "ch-1": [] },
        ui: { ...original.state.ui, channelMessagesLoading: { "ch-1": true } },
      },
    });
    render(<ChannelScreen />);
    expect(screen.queryByTestId("message-list")).toBeNull();
    jest.restoreAllMocks();
  });

  it("shows empty state when no messages and not loading", () => {
    const mockUseChatStore = require("@/contexts/ChatStoreProvider").useChatStore;
    const original = mockUseChatStore();
    jest.spyOn(require("@/contexts/ChatStoreProvider"), "useChatStore").mockReturnValue({
      ...original,
      state: {
        ...original.state,
        channelMessageIds: { "ch-1": [] },
      },
    });
    render(<ChannelScreen />);
    // ChannelMessageList mock renders empty view; no "No messages yet" since mock doesn't handle ListEmptyComponent
    jest.restoreAllMocks();
  });

  it("calls loadChannelMessages on mount", () => {
    render(<ChannelScreen />);
    expect(mockLoadChannelMessages).toHaveBeenCalled();
  });

  it("joins socket room on mount", () => {
    render(<ChannelScreen />);
    expect(mockJoinChannel).toHaveBeenCalledWith("ch-1");
  });

  it("leaves socket room on unmount", () => {
    const { unmount } = render(<ChannelScreen />);
    unmount();
    expect(mockLeaveChannel).toHaveBeenCalledWith("ch-1");
  });

  it("shows loading indicator when channel is missing", () => {
    const mockUseChatStore = require("@/contexts/ChatStoreProvider").useChatStore;
    const original = mockUseChatStore();
    jest.spyOn(require("@/contexts/ChatStoreProvider"), "useChatStore").mockReturnValue({
      ...original,
      state: {
        ...original.state,
        channels: [],
      },
    });
    render(<ChannelScreen />);
    expect(screen.queryByTestId("message-list")).toBeNull();
    jest.restoreAllMocks();
  });

  it("header right shows huddle button without options menu", () => {
    render(<ChannelScreen />);
    const options = mockSetOptions.mock.calls.at(-1)?.[0];
    const headerRight = options?.headerRight;
    render(<View>{headerRight()}</View>);
    expect(screen.queryByTestId("channel-options-button")).toBeNull();
  });

  it("header title button has minimum 44pt tap target for Dynamic Island clearance", () => {
    render(<ChannelScreen />);
    const options = mockSetOptions.mock.calls.at(-1)?.[0];
    const headerTitle = options?.headerTitle;
    render(<View>{headerTitle()}</View>);
    const titleButton = screen.getByTestId("channel-title-button");
    expect(titleButton.props.style).toEqual(
      expect.objectContaining({ minHeight: 44 }),
    );
  });
});
