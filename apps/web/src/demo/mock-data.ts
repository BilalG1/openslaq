import type { Attachment, Channel, Message } from "@openslaq/shared";
import { asChannelId, asMessageId, asUserId } from "@openslaq/shared";
import type { DmConversation, PresenceEntry, WorkspaceInfo } from "../state/chat-store";
import type { GalleryMockData, MockUser } from "../gallery/gallery-context";
import {
  MOCK_CHANNELS,
  MOCK_CURRENT_USER,
  MOCK_DMS,
  MOCK_GENERAL_MESSAGES,
  MOCK_MEMBERS,
  MOCK_PRESENCE,
  MOCK_THREAD_REPLIES,
  MOCK_UNREAD_COUNTS,
  MOCK_WORKSPACE,
  CHANNEL_IDS,
  USER_IDS,
} from "../gallery/mock-data";

const NOW = Date.now();

export const DEMO_USER: MockUser = MOCK_CURRENT_USER;

export const DEMO_WORKSPACES: WorkspaceInfo[] = [MOCK_WORKSPACE];

export const DEMO_CHANNEL_IDS = {
  ...CHANNEL_IDS,
  support: asChannelId("ch-support"),
  dmAlice: asChannelId("ch-dm-alice"),
} as const;

export const DEMO_CHANNELS: Channel[] = [
  ...MOCK_CHANNELS,
  {
    id: DEMO_CHANNEL_IDS.support,
    workspaceId: MOCK_WORKSPACE.id,
    name: "support",
    type: "public",
    description: "Customer support and triage",
    displayName: null,
    isArchived: false,
    createdBy: asUserId(USER_IDS.alice),
    createdAt: new Date(NOW - 1000 * 60 * 60 * 24).toISOString(),
  },
];

export const DEMO_DMS: DmConversation[] = [
  ...MOCK_DMS,
  {
    channel: {
      id: DEMO_CHANNEL_IDS.dmAlice,
      workspaceId: MOCK_WORKSPACE.id,
      name: "dm",
      type: "dm",
      description: null,
      displayName: null,
      isArchived: false,
      createdBy: null,
      createdAt: new Date(NOW - 1000 * 60 * 60 * 12).toISOString(),
    },
    otherUser: {
      id: asUserId(USER_IDS.alice),
      displayName: "Alice Park",
      avatarUrl: null,
    },
    lastMessageContent: null,
    lastMessageAt: null,
  },
];

function mkMessage(params: {
  id: string;
  channelId: string;
  userId: string;
  senderDisplayName: string;
  content: string;
  minutesAgo: number;
  parentMessageId?: string | null;
  replyCount?: number;
  latestReplyAt?: string | null;
  attachments?: Attachment[];
}): Message {
  const createdAt = new Date(NOW - params.minutesAgo * 60_000).toISOString();
  return {
    id: asMessageId(params.id),
    channelId: asChannelId(params.channelId),
    userId: asUserId(params.userId),
    senderDisplayName: params.senderDisplayName,
    senderAvatarUrl: null,
    content: params.content,
    parentMessageId: params.parentMessageId ? asMessageId(params.parentMessageId) : null,
    replyCount: params.replyCount ?? 0,
    latestReplyAt: params.latestReplyAt ?? null,
    attachments: params.attachments ?? [],
    reactions: [],
    mentions: [],
    createdAt,
    updatedAt: createdAt,
  };
}

const engineeringMessages: Message[] = [
  mkMessage({
    id: "eng-1",
    channelId: DEMO_CHANNEL_IDS.engineering,
    userId: USER_IDS.bob,
    senderDisplayName: "Bob Chen",
    content: "Shipping demo mode today. Let's keep all behavior frontend-only.",
    minutesAgo: 75,
  }),
  mkMessage({
    id: "eng-2",
    channelId: DEMO_CHANNEL_IDS.engineering,
    userId: USER_IDS.you,
    senderDisplayName: "You",
    content: "I can cover message send, reactions, threads, and search in demo runtime.",
    minutesAgo: 72,
  }),
];

const randomMessages: Message[] = [
  mkMessage({
    id: "random-1",
    channelId: DEMO_CHANNEL_IDS.random,
    userId: USER_IDS.carol,
    senderDisplayName: "Carol Davis",
    content: "Fun fact: this channel receives periodic bot updates in demo mode.",
    minutesAgo: 50,
  }),
];

const supportMessages: Message[] = [
  mkMessage({
    id: "support-1",
    channelId: DEMO_CHANNEL_IDS.support,
    userId: USER_IDS.alice,
    senderDisplayName: "Alice Park",
    content: "Welcome to #support. Use threads to keep incident discussion organized.",
    minutesAgo: 40,
  }),
];

const dmAliceMessages: Message[] = [
  mkMessage({
    id: "dm-alice-1",
    channelId: DEMO_CHANNEL_IDS.dmAlice,
    userId: USER_IDS.alice,
    senderDisplayName: "Alice Park",
    content: "Could you review the demo script before launch?",
    minutesAgo: 25,
  }),
  mkMessage({
    id: "dm-alice-2",
    channelId: DEMO_CHANNEL_IDS.dmAlice,
    userId: USER_IDS.you,
    senderDisplayName: "You",
    content: "Yep, I'll do that in a few minutes.",
    minutesAgo: 22,
  }),
];

export const DEMO_CHANNEL_MESSAGES: Record<string, Message[]> = {
  [DEMO_CHANNEL_IDS.general]: MOCK_GENERAL_MESSAGES,
  [DEMO_CHANNEL_IDS.engineering]: engineeringMessages,
  [DEMO_CHANNEL_IDS.random]: randomMessages,
  [DEMO_CHANNEL_IDS.support]: supportMessages,
  [DEMO_CHANNEL_IDS.dmBob]: [
    mkMessage({
      id: "dm-bob-1",
      channelId: DEMO_CHANNEL_IDS.dmBob,
      userId: USER_IDS.bob,
      senderDisplayName: "Bob Chen",
      content: "Demo mode looks great. Want me to test reactions?",
      minutesAgo: 20,
    }),
    mkMessage({
      id: "dm-bob-2",
      channelId: DEMO_CHANNEL_IDS.dmBob,
      userId: USER_IDS.you,
      senderDisplayName: "You",
      content: "Yes please. Also try search and threading.",
      minutesAgo: 18,
    }),
  ],
  [DEMO_CHANNEL_IDS.dmAlice]: dmAliceMessages,
};

export const DEMO_THREAD_REPLIES: Record<string, { parent: Message; replies: Message[] }> = {
  "msg-6": {
    parent: MOCK_GENERAL_MESSAGES.find((m) => m.id === "msg-6")!,
    replies: MOCK_THREAD_REPLIES,
  },
};

export const DEMO_UNREAD_COUNTS: Record<string, number> = {
  ...MOCK_UNREAD_COUNTS,
  [DEMO_CHANNEL_IDS.support]: 2,
  [DEMO_CHANNEL_IDS.dmAlice]: 1,
};

export const DEMO_PRESENCE: Record<string, PresenceEntry> = {
  ...MOCK_PRESENCE,
};

export const DEMO_MEMBERS: GalleryMockData["members"] = MOCK_MEMBERS;

export const DEMO_MOCK_DATA: GalleryMockData = {
  members: DEMO_MEMBERS,
};
