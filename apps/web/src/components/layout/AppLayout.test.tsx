import { describe, test, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "../../test-utils";

// Hoisted mocks — must run before any await expressions
vi.mock("@stripe/stripe-js", () => ({ loadStripe: async () => null }));
vi.mock("../../env", () => ({
  env: { VITE_API_URL: "http://localhost:3001", VITE_STACK_PROJECT_ID: "00000000-0000-1000-8000-000000000000", VITE_STACK_PUBLISHABLE_CLIENT_KEY: "test" },
}));
vi.mock("../../stack", () => ({
  stackApp: {},
}));
// -- Mock all hooks as no-ops --
const mockState = {
  workspaceSlug: "test-ws",
  workspaces: [],
  channels: [],
  dms: [],
  groupDms: [],
  activeView: "channel" as const,
  composePreviewChannelId: null,
  activeChannelId: null,
  activeDmId: null,
  activeGroupDmId: null,
  activeThreadId: null,
  activeProfileUserId: null,
  messagesById: {},
  channelMessageIds: {},
  threadReplyIds: {},
  channelPagination: {},
  threadPagination: {},
  unreadCounts: {},
  presence: {},
  activeHuddles: {},
  currentHuddleChannelId: null,
  starredChannelIds: [],
  savedMessageIds: [],
  channelNotificationPrefs: {},
  customEmojis: [],
  channelBookmarks: {},
  markedUnreadChannelId: null,
  scrollTarget: null,
  ui: {
    bootstrapLoading: false,
    bootstrapError: null as string | null,
  },
};

vi.mock("../../state/chat-store", () => ({
  useChatStore: () => ({ state: mockState, dispatch: () => {} }),
  useChatSelectors: () => ({
    activeChannel: null,
    activeDm: null,
    activeGroupDm: null,
    currentChannelId: null,
    channelMessages: [],
    threadParent: null,
    threadReplies: [],
  }),
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ workspaceSlug: "test-ws" }),
  useNavigate: () => () => {},
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode; [k: string]: unknown }) => <a href={to} {...props}>{children}</a>,
}));

vi.mock("../../hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ id: "user-1", displayName: "Test", primaryEmail: "test@test.com", profileImageUrl: null, getAuthJson: async () => ({ accessToken: "t" }), update: async () => {} }),
}));

// Mock all tracking/action hooks as no-ops
vi.mock("../../hooks/chat/useWorkspaceBootstrap", () => ({ useWorkspaceBootstrap: () => undefined }));
vi.mock("../../hooks/chat/useViewRouteSync", () => ({ useViewRouteSync: () => undefined }));
vi.mock("../../hooks/chat/useUnreadTracking", () => ({ useUnreadTracking: () => undefined }));
vi.mock("../../hooks/chat/usePresenceTracking", () => ({ usePresenceTracking: () => undefined }));
vi.mock("../../hooks/chat/useHuddleTracking", () => ({ useHuddleTracking: () => undefined }));
vi.mock("../../hooks/chat/useChannelMemberTracking", () => ({ useChannelMemberTracking: () => undefined }));
vi.mock("../../hooks/chat/useCustomEmojiTracking", () => ({ useCustomEmojiTracking: () => undefined }));
vi.mock("../../hooks/chat/useBookmarkTracking", () => ({ useBookmarkTracking: () => undefined }));
vi.mock("../../hooks/useNotifications", () => ({ useNotifications: () => undefined }));
vi.mock("../../hooks/chat/useDockBadge", () => ({ useDockBadge: () => undefined }));
vi.mock("../../hooks/useMenuEvents", () => ({ useMenuEvents: () => undefined }));
vi.mock("../../hooks/chat/useDeepLinkNavigation", () => ({ useDeepLinkNavigation: () => undefined }));
vi.mock("../../hooks/chat/useScrollToMessage", () => ({ useScrollToMessage: () => undefined }));
vi.mock("../../hooks/chat/useSavedMessages", () => ({ useSavedMessageIds: () => undefined }));
vi.mock("../../hooks/chat/useSlashCommands", () => ({ useSlashCommands: () => [] }));
vi.mock("../../hooks/chat/useTypingEmitter", () => ({ useTypingEmitter: () => ({ emitTyping: () => {} }) }));
vi.mock("../../hooks/chat/useTypingTracking", () => ({ useTypingTracking: () => undefined }));

// Mock hooks that return objects
vi.mock("../../hooks/chat/useDmActions", () => ({
  useDmActions: () => ({ createDm: async () => {} }),
}));
vi.mock("../../hooks/chat/useWorkspaceMembers", () => ({
  useWorkspaceMembers: () => ({ workspaceMembers: [] }),
}));
vi.mock("../../hooks/chat/useChannelActions", () => ({
  useChannelActions: () => ({ onChannelCreated: () => {}, setNotificationLevel: () => {} }),
}));
vi.mock("../../hooks/chat/useMessageActions", () => ({
  useMessageActions: () => ({ sendMessage: async () => {}, editMessage: async () => {}, deleteMessage: async () => {}, toggleReaction: async () => {}, shareMessage: async () => {} }),
}));
vi.mock("../../hooks/chat/usePinnedMessages", () => ({
  usePinnedMessages: () => ({ pinnedMessages: [], pinMessage: async () => {}, unpinMessage: async () => {} }),
}));
vi.mock("../../hooks/chat/useChannelPopovers", () => ({
  useChannelPopovers: () => ({ popoverOpen: null, setPopoverOpen: () => {} }),
}));
vi.mock("../../hooks/useResizable", () => ({
  useResizable: () => ({ width: 260, isDragging: false, handleMouseDown: () => {} }),
}));
vi.mock("../../hooks/chat/useHuddleActions", () => ({
  useHuddleActions: () => ({}),
}));
vi.mock("../../hooks/useFileDragOverlay", () => ({
  useFileDragOverlay: () => ({ isDraggingFiles: false }),
}));

// Mock all child components as stubs
vi.mock("./Sidebar", () => ({ Sidebar: () => <div data-testid="sidebar-stub">Sidebar</div> }));
vi.mock("./ResizeHandle", () => ({ ResizeHandle: () => null }));
vi.mock("../update/UpdateBanner", () => ({ UpdateBanner: () => null }));
vi.mock("../message/MessageList", () => ({ MessageList: () => null }));
vi.mock("../message/MessageInput", () => ({ MessageInput: () => null, MessageInputHandle: {} }));
vi.mock("../message/TypingIndicator", () => ({ TypingIndicator: () => null }));
vi.mock("../channel/ChannelHeader", () => ({ ChannelHeader: () => null }));
vi.mock("../dm/DmHeader", () => ({ DmHeader: () => null }));
vi.mock("../message/ThreadPanel", () => ({ ThreadPanel: () => null }));
vi.mock("../profile/UserProfileSidebar", () => ({ UserProfileSidebar: () => null }));
vi.mock("../search/SearchModal", () => ({ SearchModal: () => null }));
vi.mock("../compose/ComposeView", () => ({ ComposeView: () => null }));
vi.mock("../channel/PinnedMessagesPopover", () => ({ PinnedMessagesPopover: () => null }));
vi.mock("../message/ShareMessageDialog", () => ({ ShareMessageDialog: () => null }));
vi.mock("../unreads/AllUnreadsView", () => ({ AllUnreadsView: () => null }));
vi.mock("../saved/SavedItemsView", () => ({ SavedItemsView: () => null }));
vi.mock("../outbox/OutboxView", () => ({ OutboxView: () => null }));
vi.mock("../files/FilesView", () => ({ FilesView: () => null }));
vi.mock("../channel/ChannelFilesPopover", () => ({ ChannelFilesPopover: () => null }));
vi.mock("../channel/BookmarksBar", () => ({ BookmarksBar: () => null }));
vi.mock("../channel/AddBookmarkDialog", () => ({ AddBookmarkDialog: () => null }));
vi.mock("../message/ScheduledMessagesBanner", () => ({ ScheduledMessagesBanner: () => null }));

// Mock the ui components used directly
vi.mock("../ui", () => ({
  LoadingState: ({ label }: { label: string }) => <div data-testid="loading-state">{label}</div>,
  EmptyState: ({ title, subtitle, action, ...props }: { title: string; subtitle?: string; action?: React.ReactNode; "data-testid"?: string; [k: string]: unknown }) => <div data-testid={props["data-testid"] ?? "empty-state"}>{title}{subtitle && <p>{subtitle}</p>}{action}</div>,
  Button: ({ children, asChild, ...props }: { children: React.ReactNode; asChild?: boolean; [k: string]: unknown }) => asChild ? <>{children}</> : <button {...props}>{children}</button>,
}));

import { AppLayout } from "./AppLayout";

describe("AppLayout", () => {
  afterEach(() => {
    cleanup();
    // Reset state between tests
    mockState.ui.bootstrapLoading = false;
    mockState.ui.bootstrapError = null;
  });
  test("hides sidebar when bootstrap error occurs and shows link to workspaces", () => {
    mockState.ui.bootstrapError = "Not a workspace member";
    render(<AppLayout />);
    expect(screen.queryByTestId("sidebar-stub")).toBeNull();
    expect(screen.getByText("Not a workspace member")).toBeTruthy();
    const link = screen.getByRole("link", { name: "Go to workspaces" });
    expect(link.getAttribute("href")).toBe("/");
  });

  test("shows sidebar while bootstrap is loading", () => {
    mockState.ui.bootstrapLoading = true;
    render(<AppLayout />);
    expect(screen.getByTestId("sidebar-stub")).toBeTruthy();
    expect(screen.getByTestId("loading-state")).toBeTruthy();
  });

  test("shows sidebar when bootstrap succeeds", () => {
    mockState.ui.bootstrapLoading = false;
    mockState.ui.bootstrapError = null;
    render(<AppLayout />);
    expect(screen.getByTestId("sidebar-stub")).toBeTruthy();
  });
});
