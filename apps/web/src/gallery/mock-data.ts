import type { Channel, Message, SearchResultItem } from "@openslaq/shared";
import {
  asUserId,
  asWorkspaceId,
  asChannelId,
  asMessageId,
} from "@openslaq/shared";
import type {
  WorkspaceInfo,
  DmConversation,
  PresenceEntry,
} from "../state/chat-store";
import type { WorkspaceInfo as WorkspaceInfoApi } from "../hooks/api/useWorkspacesApi";
import type { MockUser } from "./gallery-context";

// ── Users ──

export const MOCK_CURRENT_USER: MockUser = {
  id: "user-you",
  getAuthJson: async () => ({ accessToken: "gallery-mock-token" }),
};

const YOU_ID = asUserId("user-you");
const ALICE_ID = asUserId("user-alice");
const BOB_ID = asUserId("user-bob");
const CAROL_ID = asUserId("user-carol");

// ── Workspace ──

const WORKSPACE_ID = asWorkspaceId("ws-acme");

export const MOCK_WORKSPACE: WorkspaceInfo = {
  id: WORKSPACE_ID,
  name: "Acme Corp",
  slug: "acme",
  createdAt: "2025-01-01T00:00:00Z",
  role: "owner",
};

// ── Channels ──

const GENERAL_ID = asChannelId("ch-general");
const ENGINEERING_ID = asChannelId("ch-engineering");
const RANDOM_ID = asChannelId("ch-random");
const DM_BOB_ID = asChannelId("ch-dm-bob");

export const MOCK_CHANNELS: Channel[] = [
  {
    id: GENERAL_ID,
    workspaceId: WORKSPACE_ID,
    name: "general",
    type: "public",
    description: "Company-wide announcements",
    displayName: null,
    isArchived: false,
    createdBy: YOU_ID,
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: ENGINEERING_ID,
    workspaceId: WORKSPACE_ID,
    name: "engineering",
    type: "public",
    description: "Engineering discussions",
    displayName: null,
    isArchived: false,
    createdBy: YOU_ID,
    createdAt: "2025-01-02T00:00:00Z",
  },
  {
    id: RANDOM_ID,
    workspaceId: WORKSPACE_ID,
    name: "random",
    type: "public",
    description: "Water cooler chat",
    displayName: null,
    isArchived: false,
    createdBy: ALICE_ID,
    createdAt: "2025-01-03T00:00:00Z",
  },
];

// ── DMs ──

export const MOCK_DMS: DmConversation[] = [
  {
    channel: {
      id: DM_BOB_ID,
      workspaceId: WORKSPACE_ID,
      name: "dm",
      type: "dm",
      description: null,
      displayName: null,
      isArchived: false,
      createdBy: null,
      createdAt: "2025-02-01T00:00:00Z",
    },
    otherUser: {
      id: BOB_ID,
      displayName: "Bob Chen",
      avatarUrl: null,
    },
  },
];

export const MOCK_MEMBERS = [
  {
    id: YOU_ID,
    displayName: "You",
    email: "you@acme.test",
    avatarUrl: null,
    role: "owner",
    createdAt: "2025-01-01T00:00:00Z",
    joinedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: ALICE_ID,
    displayName: "Alice Park",
    email: "alice@acme.test",
    avatarUrl: null,
    role: "admin",
    createdAt: "2025-01-01T00:00:00Z",
    joinedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: BOB_ID,
    displayName: "Bob Chen",
    email: "bob@acme.test",
    avatarUrl: null,
    role: "member",
    createdAt: "2025-01-02T00:00:00Z",
    joinedAt: "2025-01-02T00:00:00Z",
  },
  {
    id: CAROL_ID,
    displayName: "Carol Davis",
    email: "carol@acme.test",
    avatarUrl: null,
    role: "member",
    createdAt: "2025-01-03T00:00:00Z",
    joinedAt: "2025-01-03T00:00:00Z",
  },
];

// ── Messages ──

function msg(
  id: string,
  channelId: string,
  userId: string,
  content: string,
  sender: string,
  minutesAgo: number,
  extra: Partial<Message> = {},
): Message {
  const now = Date.now();
  const ts = new Date(now - minutesAgo * 60_000).toISOString();
  return {
    id: asMessageId(id),
    channelId: asChannelId(channelId),
    userId: asUserId(userId),
    content,
    parentMessageId: null,
    replyCount: 0,
    latestReplyAt: null,
    attachments: [],
    reactions: [],
    mentions: [],
    senderDisplayName: sender,
    senderAvatarUrl: null,
    createdAt: ts,
    updatedAt: ts,
    ...extra,
  } as Message;
}

export const MOCK_GENERAL_MESSAGES: Message[] = [
  msg("msg-1", "ch-general", "user-alice", "Hey everyone! Welcome to Acme Corp's new Slaq workspace. Excited to have the team here.", "Alice Park", 120),
  msg("msg-2", "ch-general", "user-bob", "Thanks Alice! Great to be here. Quick question — where should we post **engineering updates**?", "Bob Chen", 110),
  msg("msg-3", "ch-general", "user-alice", "Good question! Let's use #engineering for technical discussions and keep #general for company-wide announcements.", "Alice Park", 105),
  msg("msg-4", "ch-general", "user-you", "Sounds good! I just pushed the initial deploy. Here's the status:\n\n```\n✓ API server: healthy\n✓ Database: connected\n✓ WebSocket: active\n```\n\nAll systems go!", "You", 90),
  msg("msg-5", "ch-general", "user-carol", "Nice work! The dashboard looks great. I noticed the [docs](https://example.com/docs) need updating though.", "Carol Davis", 80, {
    reactions: [
      { emoji: "👍", count: 2, userIds: [ALICE_ID, BOB_ID] },
      { emoji: "🚀", count: 1, userIds: [YOU_ID] },
    ],
  }),
  msg("msg-6", "ch-general", "user-alice", "I'll take care of the docs update today. @Carol can you review when it's ready?", "Alice Park", 60, {
    replyCount: 2,
    latestReplyAt: new Date(Date.now() - 45 * 60_000).toISOString(),
  }),
  msg("msg-7", "ch-general", "user-bob", "Quick reminder: team standup at **10am** tomorrow. Please have your updates ready.", "Bob Chen", 30, {
    reactions: [
      { emoji: "👀", count: 3, userIds: [YOU_ID, ALICE_ID, CAROL_ID] },
    ],
  }),
  msg("msg-8", "ch-general", "user-you", "Will do! Also — has anyone tried the new `bun` runtime for local dev? It's *blazing fast* compared to Node.", "You", 15),
  msg("msg-9", "ch-general", "user-alice", "Yes! We switched the whole monorepo to Bun last week. Build times dropped from 45s to 8s.", "Alice Park", 5, {
    reactions: [
      { emoji: "🔥", count: 2, userIds: [BOB_ID, YOU_ID] },
    ],
  }),
];

// Thread replies for msg-6 (Alice's docs update message)
export const MOCK_THREAD_REPLIES: Message[] = [
  msg("reply-1", "ch-general", "user-carol", "Sure thing! Just ping me when the PR is up.", "Carol Davis", 55, {
    parentMessageId: asMessageId("msg-6"),
  }),
  msg("reply-2", "ch-general", "user-alice", "PR is up: https://github.com/acme/docs/pull/42 — ready for review!", "Alice Park", 45, {
    parentMessageId: asMessageId("msg-6"),
  }),
];

// DM messages with Bob
export const MOCK_DM_MESSAGES: Message[] = [
  msg("dm-1", "ch-dm-bob", "user-bob", "Hey, do you have a minute to chat about the API design?", "Bob Chen", 200),
  msg("dm-2", "ch-dm-bob", "user-you", "Sure! What's on your mind?", "You", 195),
  msg("dm-3", "ch-dm-bob", "user-bob", "I'm thinking we should add **rate limiting** to the public endpoints. What do you think about using a token bucket approach?", "Bob Chen", 190),
  msg("dm-4", "ch-dm-bob", "user-you", "Good idea. Token bucket would work well. We could use Redis for the counters since we already have it in the stack.", "You", 185),
  msg("dm-5", "ch-dm-bob", "user-bob", "Perfect. I'll draft an RFC and share it in #engineering tomorrow.", "Bob Chen", 180, {
    reactions: [
      { emoji: "👍", count: 1, userIds: [YOU_ID] },
    ],
  }),
];

export const MOCK_SEARCH_RESPONSES: Record<string, { results: SearchResultItem[]; total: number; error?: string }> = {
  "*::docs": {
    results: [
      {
        messageId: asMessageId("msg-5"),
        channelId: GENERAL_ID,
        channelName: "general",
        channelType: "public",
        userId: CAROL_ID,
        userDisplayName: "Carol Davis",
        content: "Nice work! The dashboard looks great. I noticed the docs need updating though.",
        headline: "I noticed the <mark>docs</mark> need updating though.",
        parentMessageId: null,
        createdAt: new Date(Date.now() - 80 * 60_000).toISOString(),
        rank: 0.92,
      },
      {
        messageId: asMessageId("reply-2"),
        channelId: GENERAL_ID,
        channelName: "general",
        channelType: "public",
        userId: ALICE_ID,
        userDisplayName: "Alice Park",
        content: "PR is up: https://github.com/acme/docs/pull/42 — ready for review!",
        headline: "PR is up: https://github.com/acme/<mark>docs</mark>/pull/42",
        parentMessageId: asMessageId("msg-6"),
        createdAt: new Date(Date.now() - 45 * 60_000).toISOString(),
        rank: 0.84,
      },
    ],
    total: 2,
  },
};

// ── Workspace list (for "/" page) ──

export const MOCK_WORKSPACE_LIST: WorkspaceInfoApi[] = [
  {
    id: asWorkspaceId("ws-acme"),
    name: "Acme Corp",
    slug: "acme",
    createdAt: "2025-01-01T00:00:00Z",
    role: "owner",
    memberCount: 24,
  },
  {
    id: asWorkspaceId("ws-startup"),
    name: "Startup Inc",
    slug: "startup",
    createdAt: "2025-02-01T00:00:00Z",
    role: "admin",
    memberCount: 8,
  },
  {
    id: asWorkspaceId("ws-oss"),
    name: "Open Source Project",
    slug: "oss",
    createdAt: "2025-03-01T00:00:00Z",
    role: "member",
    memberCount: 142,
  },
];

// ── Presence ──

export const MOCK_PRESENCE: Record<string, PresenceEntry> = {
  [YOU_ID]: { online: true, lastSeenAt: null },
  [ALICE_ID]: { online: true, lastSeenAt: null },
  [BOB_ID]: { online: true, lastSeenAt: null },
  [CAROL_ID]: { online: false, lastSeenAt: new Date(Date.now() - 3600_000).toISOString() },
};

// ── Unread Counts ──

export const MOCK_UNREAD_COUNTS: Record<string, number> = {
  [RANDOM_ID]: 3,
};

// ── Re-exports for scenario convenience ──

export const CHANNEL_IDS = {
  general: GENERAL_ID,
  engineering: ENGINEERING_ID,
  random: RANDOM_ID,
  dmBob: DM_BOB_ID,
} as const;

export const USER_IDS = {
  you: YOU_ID,
  alice: ALICE_ID,
  bob: BOB_ID,
  carol: CAROL_ID,
} as const;
