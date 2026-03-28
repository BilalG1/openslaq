import React from "react";
import { Alert, Text, View } from "react-native";
import { fireEvent, render, screen } from "@/test-utils";

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockSetOptions = jest.fn();
const mockDispatch = jest.fn();
const mockJoinChannel = jest.fn();
const mockLeaveChannel = jest.fn();

let mockSearchParams: Record<string, string> = { workspaceSlug: "acme", channelId: "ch-1" };

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockSearchParams,
  useNavigation: () => ({ setOptions: mockSetOptions }),
  useRouter: () => ({ push: mockPush, back: mockBack }),
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

let capturedMessageListProps: Record<string, unknown> = {};
jest.mock("@/components/ChannelMessageList", () => {
  const React = require("react");
  return {
    ChannelMessageList: React.forwardRef((props: Record<string, unknown>, _ref: unknown) => {
      capturedMessageListProps = props;
      const { Text: MockText, View: MockView } = require("react-native");
      const messages = props.messages as Array<{ content: string }>;
      return (
        <MockView testID="message-list">
          {messages.map((m: { content: string }, i: number) => (
            <MockText key={i}>{m.content}</MockText>
          ))}
        </MockView>
      );
    }),
  };
});
jest.mock("@/components/ReactionDetailsSheet", () => ({ ReactionDetailsSheet: () => null }));
const mockDismissKeyboard = jest.fn();
jest.mock("@/components/MessageInput", () => {
  const React = require("react");
  return {
    MessageInput: React.forwardRef((_props: unknown, ref: React.Ref<unknown>) => {
      React.useImperativeHandle(ref, () => ({
        dismissKeyboard: mockDismissKeyboard,
      }));
      return null;
    }),
  };
});
jest.mock("@/components/TypingIndicator", () => ({ TypingIndicator: () => null }));
jest.mock("@/components/MessageActionSheet", () => ({ MessageActionSheet: () => null }));
jest.mock("@/components/EmojiPickerSheet", () => ({ EmojiPickerSheet: () => null }));
jest.mock("@/components/EditTopicModal", () => ({ EditTopicModal: () => null }));
jest.mock("@/components/PinnedMessagesSheet", () => ({ PinnedMessagesSheet: () => null }));
jest.mock("@/components/ShareMessageModal", () => ({ ShareMessageModal: () => null }));
jest.mock("@/components/NotificationLevelSheet", () => ({
  NotificationLevelSheet: ({ visible }: { visible: boolean }) => {
    if (!visible) return null;
    const { View: V } = require("react-native");
    return <V testID="notification-level-sheet" />;
  },
}));
jest.mock("@/components/huddle/HuddleHeaderButton", () => ({ HuddleHeaderButton: () => null }));
jest.mock("@/components/ChannelInfoPanel.variant-a", () => ({
  ChannelInfoPanel: ({ visible, onNotificationPress, onClose }: { visible: boolean; onNotificationPress?: () => void; onClose?: () => void }) => {
    if (!visible) return null;
    const { View: V, Pressable: P, Text: T } = require("react-native");
    return (
      <V testID="channel-info-panel">
        {onNotificationPress && (
          <P testID="info-notification-btn" onPress={onNotificationPress}>
            <T>Notifications</T>
          </P>
        )}
        {onClose && (
          <P testID="info-close-btn" onPress={onClose}>
            <T>Close</T>
          </P>
        )}
      </V>
    );
  },
}));

import { loadChannelMessages } from "@openslaq/client-core";
import ChannelScreen from "../../../app/(app)/[workspaceSlug]/(tabs)/(channels)/[channelId]";

const mockLoadChannelMessages = loadChannelMessages as jest.Mock;

describe("ChannelScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWorkspaceRole = "owner";
    mockSearchParams = { workspaceSlug: "acme", channelId: "ch-1" };
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

  it("header right does not show pinned messages button", () => {
    render(<ChannelScreen />);
    const options = mockSetOptions.mock.calls.at(-1)?.[0];
    const headerRight = options?.headerRight;
    render(<View>{headerRight()}</View>);
    expect(screen.queryByTestId("pinned-messages-button")).toBeNull();
  });

  it("header title button is hittable without minHeight overflow", () => {
    render(<ChannelScreen />);
    const options = mockSetOptions.mock.calls.at(-1)?.[0];
    const headerTitle = options?.headerTitle;
    render(<View>{headerTitle()}</View>);
    const titleButton = screen.getByTestId("channel-title-button");
    // minHeight removed to prevent bounds extending outside nav bar (Detox hittability issue)
    expect(titleButton.props.style).not.toEqual(
      expect.objectContaining({ minHeight: 44 }),
    );
    // hitSlop expands touch target without inflating layout bounds
    expect(titleButton.props.hitSlop).toBe(12);
  });

  it("opens channel info panel when showInfo query param is true", () => {
    mockSearchParams = { workspaceSlug: "acme", channelId: "ch-1", showInfo: "true" };
    render(<ChannelScreen />);
    expect(screen.getByTestId("channel-info-panel")).toBeTruthy();
  });

  it("does not open channel info panel without showInfo param", () => {
    render(<ChannelScreen />);
    expect(screen.queryByTestId("channel-info-panel")).toBeNull();
  });

  it("navigates back and shows alert when channel is removed from state", () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    const mockUseChatStore = require("@/contexts/ChatStoreProvider").useChatStore;
    const original = mockUseChatStore();

    // Start with channel present
    const stateSpy = jest.spyOn(require("@/contexts/ChatStoreProvider"), "useChatStore").mockReturnValue({
      ...original,
      state: { ...original.state },
    });

    const { rerender } = render(<ChannelScreen />);
    expect(screen.getByTestId("message-list")).toBeTruthy();

    // Simulate channel removal (e.g., user was removed via socket event)
    stateSpy.mockReturnValue({
      ...original,
      state: { ...original.state, channels: [] },
    });

    rerender(<ChannelScreen />);

    expect(mockBack).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      "Removed from channel",
      "You are no longer a member of #general.",
    );

    alertSpy.mockRestore();
    stateSpy.mockRestore();
  });

  it("header title shows # prefix for public channels", () => {
    render(<ChannelScreen />);
    const options = mockSetOptions.mock.calls.at(-1)?.[0];
    const headerTitle = options?.headerTitle;
    const { getByText, queryByTestId } = render(<View>{headerTitle()}</View>);
    expect(getByText("# ")).toBeTruthy();
    expect(queryByTestId("channel-header-lock-icon")).toBeNull();
  });

  it("header title shows lock icon for private channels", () => {
    const mockUseChatStore = require("@/contexts/ChatStoreProvider").useChatStore;
    const original = mockUseChatStore();
    jest.spyOn(require("@/contexts/ChatStoreProvider"), "useChatStore").mockReturnValue({
      ...original,
      state: {
        ...original.state,
        channels: [{ ...original.state.channels[0], type: "private" }],
      },
    });

    render(<ChannelScreen />);
    const options = mockSetOptions.mock.calls.at(-1)?.[0];
    const headerTitle = options?.headerTitle;
    const { getByTestId } = render(<View>{headerTitle()}</View>);
    expect(getByTestId("channel-header-lock-icon")).toBeTruthy();

    jest.restoreAllMocks();
  });

  it("closes channel info panel before showing notification sheet", () => {
    mockSearchParams = { workspaceSlug: "acme", channelId: "ch-1", showInfo: "true" };
    render(<ChannelScreen />);
    // Info panel should be visible
    expect(screen.getByTestId("channel-info-panel")).toBeTruthy();
    // Tap notifications button inside the info panel mock
    fireEvent.press(screen.getByTestId("info-notification-btn"));
    // Info panel should be closed
    expect(screen.queryByTestId("channel-info-panel")).toBeNull();
    // Notification sheet should be visible
    expect(screen.getByTestId("notification-level-sheet")).toBeTruthy();
  });

  it("shows archived banner instead of message input when channel is archived", () => {
    const mockUseChatStore = require("@/contexts/ChatStoreProvider").useChatStore;
    const original = mockUseChatStore();
    jest.spyOn(require("@/contexts/ChatStoreProvider"), "useChatStore").mockReturnValue({
      ...original,
      state: {
        ...original.state,
        channels: [{ ...original.state.channels[0], isArchived: true }],
      },
    });

    render(<ChannelScreen />);
    expect(screen.getByTestId("archived-banner")).toBeTruthy();
    expect(screen.getByText("This channel has been archived")).toBeTruthy();

    jest.restoreAllMocks();
  });

  it("dismisses keyboard when long-pressing a message", () => {
    render(<ChannelScreen />);
    const onLongPress = capturedMessageListProps.onLongPress as (msg: unknown) => void;
    onLongPress(baseMessage);
    expect(mockDismissKeyboard).toHaveBeenCalled();
  });

  it("dismisses keyboard when opening channel info", () => {
    render(<ChannelScreen />);
    const options = mockSetOptions.mock.calls.at(-1)?.[0];
    const headerTitle = options?.headerTitle;
    const { getByTestId } = render(<View>{headerTitle()}</View>);
    fireEvent.press(getByTestId("channel-title-button"));
    expect(mockDismissKeyboard).toHaveBeenCalled();
  });

  it("dismisses keyboard when adding a reaction via + button", () => {
    render(<ChannelScreen />);
    const onAddReaction = capturedMessageListProps.onAddReaction as (msg: unknown) => void;
    onAddReaction(baseMessage);
    expect(mockDismissKeyboard).toHaveBeenCalled();
  });

  it("dismisses keyboard when long-pressing a reaction", () => {
    const messageWithReactions = {
      ...baseMessage,
      reactions: [{ emoji: "👍", count: 2, userIds: ["u1", "u2"] }],
    };
    render(<ChannelScreen />);
    const onLongPressReaction = capturedMessageListProps.onLongPressReaction as (msg: unknown, emoji: string) => void;
    onLongPressReaction(messageWithReactions, "👍");
    expect(mockDismissKeyboard).toHaveBeenCalled();
  });

  it("triggers haptic feedback when pressing channel title", () => {
    const { impactAsync, ImpactFeedbackStyle } = require("expo-haptics");
    render(<ChannelScreen />);
    const options = mockSetOptions.mock.calls.at(-1)?.[0];
    const headerTitle = options?.headerTitle;
    const { getByTestId } = render(<View>{headerTitle()}</View>);
    fireEvent.press(getByTestId("channel-title-button"));
    expect(impactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Light);
  });
});
