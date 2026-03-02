import type {
  Channel,
  Workspace,
  Role,
  Message,
  ChannelId,
  MessageId,
  UserId,
  ReactionGroup,
  HuddleState,
  ChannelNotifyLevel,
  CustomEmoji,
  ChannelBookmark,
} from "@openslaq/shared";

export interface WorkspaceInfo extends Workspace {
  role: Role;
}

export interface DmConversation {
  channel: Channel;
  otherUser: { id: string; displayName: string; avatarUrl: string | null };
}

export interface GroupDmMember {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface GroupDmConversation {
  channel: Channel;
  members: GroupDmMember[];
}

interface ChatUiState {
  bootstrapLoading: boolean;
  bootstrapError: string | null;
  channelMessagesLoading: Record<string, boolean>;
  channelMessagesError: Record<string, string | null>;
  threadLoading: Record<string, boolean>;
  threadError: Record<string, string | null>;
  mutationError: string | null;
}

export interface PresenceEntry {
  online: boolean;
  lastSeenAt: string | null;
  statusEmoji?: string | null;
  statusText?: string | null;
  statusExpiresAt?: string | null;
}

export interface ScrollTarget {
  messageId: string;
  highlightMessageId: string;
}

export interface ChannelPaginationState {
  olderCursor: string | null;
  newerCursor: string | null;
  hasOlder: boolean;
  hasNewer: boolean;
  loadingOlder: boolean;
  loadingNewer: boolean;
}

export interface ThreadPaginationState {
  olderCursor: string | null;
  hasOlder: boolean;
  loadingOlder: boolean;
  newerCursor: string | null;
  hasNewer: boolean;
  loadingNewer: boolean;
}

export interface ChatStoreState {
  workspaceSlug: string | null;
  workspaces: WorkspaceInfo[];
  channels: Channel[];
  dms: DmConversation[];
  groupDms: GroupDmConversation[];
  activeView: "channel" | "unreads" | "saved" | "scheduled" | "files";
  activeChannelId: string | null;
  activeDmId: string | null;
  activeGroupDmId: string | null;
  activeThreadId: string | null;
  activeProfileUserId: string | null;
  messagesById: Record<string, Message>;
  channelMessageIds: Record<string, string[]>;
  threadReplyIds: Record<string, string[]>;
  channelPagination: Record<string, ChannelPaginationState>;
  threadPagination: Record<string, ThreadPaginationState>;
  unreadCounts: Record<string, number>;
  presence: Record<string, PresenceEntry>;
  activeHuddles: Record<string, HuddleState>;
  currentHuddleChannelId: string | null;
  starredChannelIds: string[];
  savedMessageIds: string[];
  channelNotificationPrefs: Record<string, ChannelNotifyLevel>;
  customEmojis: CustomEmoji[];
  channelBookmarks: Record<string, ChannelBookmark[]>;
  markedUnreadChannelId: string | null;
  scrollTarget: ScrollTarget | null;
  ui: ChatUiState;
}

export const initialState: ChatStoreState = {
  workspaceSlug: null,
  workspaces: [],
  channels: [],
  dms: [],
  groupDms: [],
  activeView: "channel",
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
    bootstrapError: null,
    channelMessagesLoading: {},
    channelMessagesError: {},
    threadLoading: {},
    threadError: {},
    mutationError: null,
  },
};

export type ChatAction =
  | { type: "demo/hydrate"; state: ChatStoreState }
  | { type: "workspace/bootstrapStart"; workspaceSlug: string }
  | {
      type: "workspace/bootstrapSuccess";
      channels: Channel[];
      workspaces: WorkspaceInfo[];
      dms: DmConversation[];
      groupDms: GroupDmConversation[];
    }
  | { type: "workspace/bootstrapError"; error: string }
  | { type: "workspace/selectUnreadsView" }
  | { type: "workspace/selectSavedView" }
  | { type: "workspace/selectScheduledView" }
  | { type: "workspace/selectFilesView" }
  | { type: "workspace/selectChannel"; channelId: string }
  | { type: "workspace/selectDefaultChannel"; channelId: string }
  | { type: "workspace/selectDm"; channelId: string }
  | { type: "workspace/openThread"; messageId: string }
  | { type: "workspace/closeThread" }
  | { type: "workspace/openProfile"; userId: string }
  | { type: "workspace/closeProfile" }
  | { type: "workspace/addDm"; dm: DmConversation }
  | { type: "workspace/addGroupDm"; groupDm: GroupDmConversation }
  | { type: "workspace/selectGroupDm"; channelId: string }
  | { type: "workspace/removeGroupDm"; channelId: string }
  | { type: "workspace/updateGroupDm"; groupDm: GroupDmConversation }
  | { type: "workspace/addChannel"; channel: Channel }
  | { type: "workspace/updateChannel"; channel: Channel }
  | { type: "workspace/removeChannel"; channelId: string }
  | { type: "channel/loadStart"; channelId: string }
  | { type: "channel/loadError"; channelId: string; error: string }
  | {
      type: "channel/setMessages";
      channelId: string;
      messages: Message[];
      olderCursor?: string | null;
      newerCursor?: string | null;
      hasOlder?: boolean;
      hasNewer?: boolean;
    }
  | { type: "channel/prependMessages"; channelId: string; messages: Message[]; olderCursor: string | null; hasOlder: boolean }
  | { type: "channel/appendMessages"; channelId: string; messages: Message[]; newerCursor: string | null; hasNewer: boolean }
  | { type: "channel/setLoadingOlder"; channelId: string; loading: boolean }
  | { type: "channel/setLoadingNewer"; channelId: string; loading: boolean }
  | { type: "thread/loadStart"; parentMessageId: string }
  | { type: "thread/loadError"; parentMessageId: string; error: string }
  | {
      type: "thread/setData";
      parent: Message;
      replies: Message[];
      olderCursor?: string | null;
      hasOlder?: boolean;
      newerCursor?: string | null;
      hasNewer?: boolean;
    }
  | { type: "thread/prependReplies"; parentMessageId: string; replies: Message[]; olderCursor: string | null; hasOlder: boolean }
  | { type: "thread/setLoadingOlder"; parentMessageId: string; loading: boolean }
  | { type: "thread/appendReplies"; parentMessageId: string; replies: Message[]; newerCursor: string | null; hasNewer: boolean }
  | { type: "thread/setLoadingNewer"; parentMessageId: string; loading: boolean }
  | { type: "messages/upsert"; message: Message }
  | { type: "messages/delete"; messageId: string; channelId: string }
  | { type: "messages/updateReactions"; messageId: string; reactions: ReactionGroup[] }
  | {
      type: "messages/updateThreadSummary";
      channelId: ChannelId;
      parentMessageId: MessageId;
      replyCount: number;
      latestReplyAt: string;
    }
  | { type: "mutations/error"; error: string | null }
  | { type: "unread/setCounts"; counts: Record<string, number> }
  | { type: "unread/increment"; channelId: string }
  | { type: "unread/clear"; channelId: string }
  | { type: "unread/setCount"; channelId: string; count: number }
  | { type: "unread/suppressAutoRead"; channelId: string }
  | {
      type: "presence/sync";
      users: Array<{
        userId: string;
        online: boolean;
        lastSeenAt: string | null;
        statusEmoji?: string | null;
        statusText?: string | null;
        statusExpiresAt?: string | null;
      }>;
    }
  | {
      type: "presence/updated";
      userId: string;
      online: boolean;
      lastSeenAt: string | null;
    }
  | {
      type: "user/statusUpdated";
      userId: string;
      statusEmoji: string | null;
      statusText: string | null;
      statusExpiresAt: string | null;
    }
  | { type: "navigation/setScrollTarget"; scrollTarget: ScrollTarget }
  | { type: "navigation/clearScrollTarget" }
  | { type: "huddle/sync"; huddles: HuddleState[] }
  | { type: "huddle/started"; huddle: HuddleState }
  | { type: "huddle/updated"; huddle: HuddleState }
  | { type: "huddle/ended"; channelId: string }
  | { type: "huddle/setCurrentChannel"; channelId: string | null }
  | { type: "stars/set"; channelIds: string[] }
  | { type: "stars/add"; channelId: string }
  | { type: "stars/remove"; channelId: string }
  | { type: "notifyPrefs/set"; prefs: Record<string, ChannelNotifyLevel> }
  | { type: "notifyPrefs/update"; channelId: string; level: ChannelNotifyLevel }
  | { type: "messages/updatePinStatus"; messageId: string; isPinned: boolean; pinnedBy?: string; pinnedAt?: string }
  | { type: "saved/set"; messageIds: string[] }
  | { type: "saved/add"; messageId: string }
  | { type: "saved/remove"; messageId: string }
  | { type: "emoji/set"; emojis: CustomEmoji[] }
  | { type: "emoji/add"; emoji: CustomEmoji }
  | { type: "emoji/remove"; emojiId: string }
  | { type: "bookmarks/set"; channelId: string; bookmarks: ChannelBookmark[] }
  | { type: "bookmarks/add"; bookmark: ChannelBookmark }
  | { type: "bookmarks/remove"; channelId: string; bookmarkId: string };

function dedupeIds(ids: string[]): string[] {
  return Array.from(new Set(ids));
}

function insertSortedByCreatedAt(state: ChatStoreState, ids: string[], messageId: string): string[] {
  const next = [...ids, messageId];
  next.sort((a, b) => {
    const aDate = state.messagesById[a]?.createdAt ?? "";
    const bDate = state.messagesById[b]?.createdAt ?? "";
    return new Date(aDate).getTime() - new Date(bDate).getTime();
  });
  return dedupeIds(next);
}

export function chatReducer(state: ChatStoreState, action: ChatAction): ChatStoreState {
  switch (action.type) {
    case "demo/hydrate": {
      return {
        ...action.state,
        ui: { ...action.state.ui, mutationError: null },
      };
    }
    case "workspace/bootstrapStart": {
      const sameWorkspace = state.workspaceSlug === action.workspaceSlug;
      return {
        ...state,
        workspaceSlug: action.workspaceSlug,
        channels: sameWorkspace ? state.channels : [],
        dms: sameWorkspace ? state.dms : [],
        groupDms: sameWorkspace ? state.groupDms : [],
        activeChannelId: sameWorkspace ? state.activeChannelId : null,
        activeDmId: sameWorkspace ? state.activeDmId : null,
        activeGroupDmId: sameWorkspace ? state.activeGroupDmId : null,
        activeThreadId: null,
        activeProfileUserId: state.activeProfileUserId,
        presence: sameWorkspace ? state.presence : {},
        starredChannelIds: sameWorkspace ? state.starredChannelIds : [],
        savedMessageIds: sameWorkspace ? state.savedMessageIds : [],
        channelNotificationPrefs: sameWorkspace ? state.channelNotificationPrefs : {},
        customEmojis: sameWorkspace ? state.customEmojis : [],
        ui: {
          ...state.ui,
          bootstrapLoading: true,
          bootstrapError: null,
        },
      };
    }
    case "workspace/bootstrapSuccess": {
      return {
        ...state,
        channels: action.channels,
        workspaces: action.workspaces,
        dms: action.dms,
        groupDms: action.groupDms,
        ui: {
          ...state.ui,
          bootstrapLoading: false,
          bootstrapError: null,
        },
      };
    }
    case "workspace/bootstrapError": {
      return {
        ...state,
        ui: {
          ...state.ui,
          bootstrapLoading: false,
          bootstrapError: action.error,
        },
      };
    }
    case "workspace/selectUnreadsView": {
      return {
        ...state,
        activeView: "unreads",
        activeChannelId: null,
        activeDmId: null,
        activeGroupDmId: null,
        activeThreadId: null,
        activeProfileUserId: null,
      };
    }
    case "workspace/selectSavedView": {
      return {
        ...state,
        activeView: "saved",
        activeChannelId: null,
        activeDmId: null,
        activeGroupDmId: null,
        activeThreadId: null,
        activeProfileUserId: null,
      };
    }
    case "workspace/selectScheduledView": {
      return {
        ...state,
        activeView: "scheduled",
        activeChannelId: null,
        activeDmId: null,
        activeGroupDmId: null,
        activeThreadId: null,
        activeProfileUserId: null,
      };
    }
    case "workspace/selectFilesView": {
      return {
        ...state,
        activeView: "files",
        activeChannelId: null,
        activeDmId: null,
        activeGroupDmId: null,
        activeThreadId: null,
        activeProfileUserId: null,
      };
    }
    case "workspace/selectChannel": {
      const { [action.channelId]: _, ...restUnread } = state.unreadCounts;
      return {
        ...state,
        activeView: "channel",
        activeChannelId: action.channelId,
        activeDmId: null,
        activeGroupDmId: null,
        activeThreadId: null,
        activeProfileUserId: null,
        unreadCounts: restUnread,
        markedUnreadChannelId: null,
      };
    }
    case "workspace/selectDefaultChannel": {
      // Used by bootstrap — only select if user hasn't explicitly chosen unreads view
      if (state.activeView === "unreads" || state.activeView === "saved" || state.activeView === "scheduled" || state.activeView === "files" || state.activeChannelId || state.activeDmId || state.activeGroupDmId) {
        return state;
      }
      return {
        ...state,
        activeView: "channel",
        activeChannelId: action.channelId,
        activeDmId: null,
        activeGroupDmId: null,
        activeThreadId: null,
        activeProfileUserId: null,
        markedUnreadChannelId: null,
      };
    }
    case "workspace/selectDm": {
      const { [action.channelId]: _, ...restUnread } = state.unreadCounts;
      return {
        ...state,
        activeView: "channel",
        activeDmId: action.channelId,
        activeChannelId: null,
        activeGroupDmId: null,
        activeThreadId: null,
        activeProfileUserId: null,
        unreadCounts: restUnread,
        markedUnreadChannelId: null,
      };
    }
    case "workspace/openThread": {
      return {
        ...state,
        activeThreadId: action.messageId,
        activeProfileUserId: null,
      };
    }
    case "workspace/closeThread": {
      return {
        ...state,
        activeThreadId: null,
      };
    }
    case "workspace/openProfile": {
      return {
        ...state,
        activeProfileUserId: action.userId,
        activeThreadId: null,
      };
    }
    case "workspace/closeProfile": {
      return {
        ...state,
        activeProfileUserId: null,
      };
    }
    case "workspace/addDm": {
      const exists = state.dms.some((dm) => dm.channel.id === action.dm.channel.id);
      return exists
        ? state
        : {
            ...state,
            dms: [...state.dms, action.dm],
          };
    }
    case "workspace/addGroupDm": {
      const exists = state.groupDms.some((g) => g.channel.id === action.groupDm.channel.id);
      return exists
        ? state
        : {
            ...state,
            groupDms: [...state.groupDms, action.groupDm],
          };
    }
    case "workspace/selectGroupDm": {
      const { [action.channelId]: _, ...restUnread } = state.unreadCounts;
      return {
        ...state,
        activeView: "channel",
        activeGroupDmId: action.channelId,
        activeChannelId: null,
        activeDmId: null,
        activeThreadId: null,
        activeProfileUserId: null,
        unreadCounts: restUnread,
        markedUnreadChannelId: null,
      };
    }
    case "workspace/removeGroupDm": {
      return {
        ...state,
        groupDms: state.groupDms.filter((g) => g.channel.id !== action.channelId),
        activeGroupDmId: state.activeGroupDmId === action.channelId ? null : state.activeGroupDmId,
      };
    }
    case "workspace/updateGroupDm": {
      return {
        ...state,
        groupDms: state.groupDms.map((g) =>
          g.channel.id === action.groupDm.channel.id ? action.groupDm : g,
        ),
      };
    }
    case "workspace/addChannel": {
      const exists = state.channels.some((ch) => ch.id === action.channel.id);
      return exists
        ? state
        : {
            ...state,
            channels: [...state.channels, action.channel],
          };
    }
    case "workspace/updateChannel": {
      return {
        ...state,
        channels: state.channels.map((ch) =>
          ch.id === action.channel.id ? action.channel : ch,
        ),
      };
    }
    case "workspace/removeChannel": {
      return {
        ...state,
        channels: state.channels.filter((ch) => ch.id !== action.channelId),
        activeChannelId: state.activeChannelId === action.channelId ? null : state.activeChannelId,
      };
    }
    case "channel/loadStart": {
      return {
        ...state,
        ui: {
          ...state.ui,
          channelMessagesLoading: {
            ...state.ui.channelMessagesLoading,
            [action.channelId]: true,
          },
          channelMessagesError: {
            ...state.ui.channelMessagesError,
            [action.channelId]: null,
          },
        },
      };
    }
    case "channel/loadError": {
      return {
        ...state,
        ui: {
          ...state.ui,
          channelMessagesLoading: {
            ...state.ui.channelMessagesLoading,
            [action.channelId]: false,
          },
          channelMessagesError: {
            ...state.ui.channelMessagesError,
            [action.channelId]: action.error,
          },
        },
      };
    }
    case "channel/setMessages": {
      const byId = { ...state.messagesById };
      for (const message of action.messages) {
        byId[message.id] = message;
      }

      return {
        ...state,
        messagesById: byId,
        channelMessageIds: {
          ...state.channelMessageIds,
          [action.channelId]: action.messages.map((message) => message.id),
        },
        channelPagination: {
          ...state.channelPagination,
          [action.channelId]: {
            olderCursor: action.olderCursor ?? null,
            newerCursor: action.newerCursor ?? null,
            hasOlder: action.hasOlder ?? false,
            hasNewer: action.hasNewer ?? false,
            loadingOlder: false,
            loadingNewer: false,
          },
        },
        ui: {
          ...state.ui,
          channelMessagesLoading: {
            ...state.ui.channelMessagesLoading,
            [action.channelId]: false,
          },
          channelMessagesError: {
            ...state.ui.channelMessagesError,
            [action.channelId]: null,
          },
        },
      };
    }
    case "channel/prependMessages": {
      const byId = { ...state.messagesById };
      for (const message of action.messages) {
        byId[message.id] = message;
      }
      const existingIds = state.channelMessageIds[action.channelId] ?? [];
      const newIds = action.messages.map((m) => m.id);
      const combined = dedupeIds([...newIds, ...existingIds]);
      const prev = state.channelPagination[action.channelId];

      return {
        ...state,
        messagesById: byId,
        channelMessageIds: {
          ...state.channelMessageIds,
          [action.channelId]: combined,
        },
        channelPagination: {
          ...state.channelPagination,
          [action.channelId]: {
            olderCursor: action.olderCursor,
            newerCursor: prev?.newerCursor ?? null,
            hasOlder: action.hasOlder,
            hasNewer: prev?.hasNewer ?? false,
            loadingOlder: false,
            loadingNewer: prev?.loadingNewer ?? false,
          },
        },
      };
    }
    case "channel/appendMessages": {
      const byId = { ...state.messagesById };
      for (const message of action.messages) {
        byId[message.id] = message;
      }
      const existingIds = state.channelMessageIds[action.channelId] ?? [];
      const newIds = action.messages.map((m) => m.id);
      const combined = dedupeIds([...existingIds, ...newIds]);
      const prev = state.channelPagination[action.channelId];

      return {
        ...state,
        messagesById: byId,
        channelMessageIds: {
          ...state.channelMessageIds,
          [action.channelId]: combined,
        },
        channelPagination: {
          ...state.channelPagination,
          [action.channelId]: {
            olderCursor: prev?.olderCursor ?? null,
            newerCursor: action.newerCursor,
            hasOlder: prev?.hasOlder ?? false,
            hasNewer: action.hasNewer,
            loadingOlder: prev?.loadingOlder ?? false,
            loadingNewer: false,
          },
        },
      };
    }
    case "channel/setLoadingOlder": {
      const prev = state.channelPagination[action.channelId];
      if (!prev) return state;
      return {
        ...state,
        channelPagination: {
          ...state.channelPagination,
          [action.channelId]: { ...prev, loadingOlder: action.loading },
        },
      };
    }
    case "channel/setLoadingNewer": {
      const prev = state.channelPagination[action.channelId];
      if (!prev) return state;
      return {
        ...state,
        channelPagination: {
          ...state.channelPagination,
          [action.channelId]: { ...prev, loadingNewer: action.loading },
        },
      };
    }
    case "thread/loadStart": {
      return {
        ...state,
        ui: {
          ...state.ui,
          threadLoading: {
            ...state.ui.threadLoading,
            [action.parentMessageId]: true,
          },
          threadError: {
            ...state.ui.threadError,
            [action.parentMessageId]: null,
          },
        },
      };
    }
    case "thread/loadError": {
      return {
        ...state,
        ui: {
          ...state.ui,
          threadLoading: {
            ...state.ui.threadLoading,
            [action.parentMessageId]: false,
          },
          threadError: {
            ...state.ui.threadError,
            [action.parentMessageId]: action.error,
          },
        },
      };
    }
    case "thread/setData": {
      const byId = {
        ...state.messagesById,
        [action.parent.id]: action.parent,
      };
      for (const reply of action.replies) {
        byId[reply.id] = reply;
      }

      return {
        ...state,
        messagesById: byId,
        threadReplyIds: {
          ...state.threadReplyIds,
          [action.parent.id]: action.replies.map((reply) => reply.id),
        },
        threadPagination: {
          ...state.threadPagination,
          [action.parent.id]: {
            olderCursor: action.olderCursor ?? null,
            hasOlder: action.hasOlder ?? false,
            loadingOlder: false,
            newerCursor: action.newerCursor ?? null,
            hasNewer: action.hasNewer ?? false,
            loadingNewer: false,
          },
        },
        ui: {
          ...state.ui,
          threadLoading: {
            ...state.ui.threadLoading,
            [action.parent.id]: false,
          },
          threadError: {
            ...state.ui.threadError,
            [action.parent.id]: null,
          },
        },
      };
    }
    case "thread/prependReplies": {
      const byId = { ...state.messagesById };
      for (const reply of action.replies) {
        byId[reply.id] = reply;
      }
      const existingIds = state.threadReplyIds[action.parentMessageId] ?? [];
      const newIds = action.replies.map((r) => r.id);
      const combined = dedupeIds([...newIds, ...existingIds]);
      const prev = state.threadPagination[action.parentMessageId];

      return {
        ...state,
        messagesById: byId,
        threadReplyIds: {
          ...state.threadReplyIds,
          [action.parentMessageId]: combined,
        },
        threadPagination: {
          ...state.threadPagination,
          [action.parentMessageId]: {
            olderCursor: action.olderCursor,
            hasOlder: action.hasOlder,
            loadingOlder: false,
            newerCursor: prev?.newerCursor ?? null,
            hasNewer: prev?.hasNewer ?? false,
            loadingNewer: prev?.loadingNewer ?? false,
          },
        },
      };
    }
    case "thread/setLoadingOlder": {
      const prev = state.threadPagination[action.parentMessageId];
      if (!prev) return state;
      return {
        ...state,
        threadPagination: {
          ...state.threadPagination,
          [action.parentMessageId]: { ...prev, loadingOlder: action.loading },
        },
      };
    }
    case "thread/appendReplies": {
      const byId = { ...state.messagesById };
      for (const reply of action.replies) {
        byId[reply.id] = reply;
      }
      const existingIds = state.threadReplyIds[action.parentMessageId] ?? [];
      const newIds = action.replies.map((r) => r.id);
      const combined = dedupeIds([...existingIds, ...newIds]);
      const prev = state.threadPagination[action.parentMessageId];

      return {
        ...state,
        messagesById: byId,
        threadReplyIds: {
          ...state.threadReplyIds,
          [action.parentMessageId]: combined,
        },
        threadPagination: {
          ...state.threadPagination,
          [action.parentMessageId]: {
            olderCursor: prev?.olderCursor ?? null,
            hasOlder: prev?.hasOlder ?? false,
            loadingOlder: prev?.loadingOlder ?? false,
            newerCursor: action.newerCursor,
            hasNewer: action.hasNewer,
            loadingNewer: false,
          },
        },
      };
    }
    case "thread/setLoadingNewer": {
      const prev = state.threadPagination[action.parentMessageId];
      if (!prev) return state;
      return {
        ...state,
        threadPagination: {
          ...state.threadPagination,
          [action.parentMessageId]: { ...prev, loadingNewer: action.loading },
        },
      };
    }
    case "messages/upsert": {
      const message = action.message;
      const nextById = {
        ...state.messagesById,
        [message.id]: message,
      };

      const nextState: ChatStoreState = {
        ...state,
        messagesById: nextById,
      };

      if (message.parentMessageId) {
        const currentReplies = nextState.threadReplyIds[message.parentMessageId] ?? [];
        nextState.threadReplyIds = {
          ...nextState.threadReplyIds,
          [message.parentMessageId]: insertSortedByCreatedAt(nextState, currentReplies, message.id),
        };
      } else {
        const currentChannelIds = nextState.channelMessageIds[message.channelId] ?? [];
        nextState.channelMessageIds = {
          ...nextState.channelMessageIds,
          [message.channelId]: insertSortedByCreatedAt(nextState, currentChannelIds, message.id),
        };
      }

      return nextState;
    }
    case "messages/delete": {
      const nextById = { ...state.messagesById };
      const message = nextById[action.messageId];
      delete nextById[action.messageId];

      const nextChannelIds = state.channelMessageIds[action.channelId]?.filter((id) => id !== action.messageId) ?? [];

      const nextThreadReplyIds: Record<string, string[]> = { ...state.threadReplyIds };
      for (const parentId of Object.keys(nextThreadReplyIds)) {
        nextThreadReplyIds[parentId] = nextThreadReplyIds[parentId]!.filter((id) => id !== action.messageId);
      }

      return {
        ...state,
        activeThreadId: state.activeThreadId === action.messageId ? null : state.activeThreadId,
        messagesById: nextById,
        channelMessageIds: {
          ...state.channelMessageIds,
          [action.channelId]: nextChannelIds,
        },
        threadReplyIds: nextThreadReplyIds,
        // If a parent message was deleted, replies become inaccessible via UI and are dropped from cache.
        ...(message && !message.parentMessageId
          ? {
              threadReplyIds: Object.fromEntries(
                Object.entries(nextThreadReplyIds).filter(([parentId]) => parentId !== action.messageId),
              ),
            }
          : {}),
      };
    }
    case "messages/updateReactions": {
      const message = state.messagesById[action.messageId];
      if (!message) return state;
      return {
        ...state,
        messagesById: {
          ...state.messagesById,
          [action.messageId]: {
            ...message,
            reactions: action.reactions,
          },
        },
      };
    }
    case "messages/updateThreadSummary": {
      const parent = state.messagesById[action.parentMessageId];
      if (!parent || parent.channelId !== action.channelId) return state;
      return {
        ...state,
        messagesById: {
          ...state.messagesById,
          [action.parentMessageId]: {
            ...parent,
            replyCount: action.replyCount,
            latestReplyAt: action.latestReplyAt,
          },
        },
      };
    }
    case "mutations/error": {
      return {
        ...state,
        ui: {
          ...state.ui,
          mutationError: action.error,
        },
      };
    }
    case "unread/setCounts": {
      return {
        ...state,
        unreadCounts: action.counts,
      };
    }
    case "unread/increment": {
      return {
        ...state,
        unreadCounts: {
          ...state.unreadCounts,
          [action.channelId]: (state.unreadCounts[action.channelId] ?? 0) + 1,
        },
      };
    }
    case "unread/clear": {
      const { [action.channelId]: _, ...restUnread } = state.unreadCounts;
      return {
        ...state,
        unreadCounts: restUnread,
      };
    }
    case "unread/setCount": {
      if (action.count <= 0) {
        const { [action.channelId]: _, ...restUnread } = state.unreadCounts;
        return { ...state, unreadCounts: restUnread };
      }
      return {
        ...state,
        unreadCounts: {
          ...state.unreadCounts,
          [action.channelId]: action.count,
        },
      };
    }
    case "unread/suppressAutoRead": {
      return {
        ...state,
        markedUnreadChannelId: action.channelId,
      };
    }
    case "presence/sync": {
      const next: Record<string, PresenceEntry> = {};
      for (const u of action.users) {
        next[u.userId] = {
          online: u.online,
          lastSeenAt: u.lastSeenAt,
          statusEmoji: u.statusEmoji ?? null,
          statusText: u.statusText ?? null,
          statusExpiresAt: u.statusExpiresAt ?? null,
        };
      }
      return { ...state, presence: next };
    }
    case "presence/updated": {
      const existing = state.presence[action.userId];
      return {
        ...state,
        presence: {
          ...state.presence,
          [action.userId]: {
            ...existing,
            online: action.online,
            lastSeenAt: action.lastSeenAt,
          },
        },
      };
    }
    case "user/statusUpdated": {
      const existing = state.presence[action.userId];
      return {
        ...state,
        presence: {
          ...state.presence,
          [action.userId]: {
            online: existing?.online ?? false,
            lastSeenAt: existing?.lastSeenAt ?? null,
            statusEmoji: action.statusEmoji,
            statusText: action.statusText,
            statusExpiresAt: action.statusExpiresAt,
          },
        },
      };
    }
    case "navigation/setScrollTarget": {
      return {
        ...state,
        scrollTarget: action.scrollTarget,
      };
    }
    case "navigation/clearScrollTarget": {
      return {
        ...state,
        scrollTarget: null,
      };
    }
    case "huddle/sync": {
      const huddles: Record<string, HuddleState> = {};
      for (const h of action.huddles) {
        huddles[h.channelId] = h;
      }
      return { ...state, activeHuddles: huddles };
    }
    case "huddle/started": {
      return {
        ...state,
        activeHuddles: {
          ...state.activeHuddles,
          [action.huddle.channelId]: action.huddle,
        },
      };
    }
    case "huddle/updated": {
      return {
        ...state,
        activeHuddles: {
          ...state.activeHuddles,
          [action.huddle.channelId]: action.huddle,
        },
      };
    }
    case "huddle/ended": {
      const { [action.channelId]: _, ...rest } = state.activeHuddles;
      return {
        ...state,
        activeHuddles: rest,
        currentHuddleChannelId:
          state.currentHuddleChannelId === action.channelId
            ? null
            : state.currentHuddleChannelId,
      };
    }
    case "huddle/setCurrentChannel": {
      return {
        ...state,
        currentHuddleChannelId: action.channelId,
      };
    }
    case "stars/set": {
      return { ...state, starredChannelIds: action.channelIds };
    }
    case "stars/add": {
      if (state.starredChannelIds.includes(action.channelId)) return state;
      return { ...state, starredChannelIds: [...state.starredChannelIds, action.channelId] };
    }
    case "stars/remove": {
      return { ...state, starredChannelIds: state.starredChannelIds.filter((id) => id !== action.channelId) };
    }
    case "notifyPrefs/set": {
      return { ...state, channelNotificationPrefs: action.prefs };
    }
    case "notifyPrefs/update": {
      if (action.level === "all") {
        const { [action.channelId]: _, ...rest } = state.channelNotificationPrefs;
        return { ...state, channelNotificationPrefs: rest };
      }
      return {
        ...state,
        channelNotificationPrefs: {
          ...state.channelNotificationPrefs,
          [action.channelId]: action.level,
        },
      };
    }
    case "messages/updatePinStatus": {
      const message = state.messagesById[action.messageId];
      if (!message) return state;
      return {
        ...state,
        messagesById: {
          ...state.messagesById,
          [action.messageId]: {
            ...message,
            isPinned: action.isPinned,
            pinnedBy: action.isPinned ? (action.pinnedBy as UserId ?? null) : null,
            pinnedAt: action.isPinned ? (action.pinnedAt ?? null) : null,
          },
        },
      };
    }
    case "saved/set": {
      return { ...state, savedMessageIds: action.messageIds };
    }
    case "saved/add": {
      if (state.savedMessageIds.includes(action.messageId)) return state;
      return { ...state, savedMessageIds: [...state.savedMessageIds, action.messageId] };
    }
    case "saved/remove": {
      return { ...state, savedMessageIds: state.savedMessageIds.filter((id) => id !== action.messageId) };
    }
    case "emoji/set": {
      return { ...state, customEmojis: action.emojis };
    }
    case "emoji/add": {
      const exists = state.customEmojis.some((e) => e.id === action.emoji.id);
      return exists ? state : { ...state, customEmojis: [...state.customEmojis, action.emoji] };
    }
    case "emoji/remove": {
      return { ...state, customEmojis: state.customEmojis.filter((e) => e.id !== action.emojiId) };
    }
    case "bookmarks/set": {
      return {
        ...state,
        channelBookmarks: {
          ...state.channelBookmarks,
          [action.channelId]: action.bookmarks,
        },
      };
    }
    case "bookmarks/add": {
      const existing = state.channelBookmarks[action.bookmark.channelId] ?? [];
      const alreadyExists = existing.some((b) => b.id === action.bookmark.id);
      if (alreadyExists) return state;
      return {
        ...state,
        channelBookmarks: {
          ...state.channelBookmarks,
          [action.bookmark.channelId]: [...existing, action.bookmark],
        },
      };
    }
    case "bookmarks/remove": {
      const existing = state.channelBookmarks[action.channelId];
      if (!existing) return state;
      return {
        ...state,
        channelBookmarks: {
          ...state.channelBookmarks,
          [action.channelId]: existing.filter((b) => b.id !== action.bookmarkId),
        },
      };
    }
    default:
      return state;
  }
}
