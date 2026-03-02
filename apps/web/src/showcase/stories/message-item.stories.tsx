import type { Message, MessageId, ChannelId, UserId } from "@openslaq/shared";
import { MessageItem } from "../../components/message/MessageItem";
import { VariantGrid, VariantItem } from "../ShowcaseSection";
import type { ComponentStory } from "../showcase-registry";

const now = new Date().toISOString();
const noop = () => {};

function msg(overrides: Partial<Message> & { id: MessageId }): Message {
  return {
    channelId: "ch_showcase" as ChannelId,
    userId: "u_alice" as UserId,
    content: "Hey team, the deploy looks good!",
    parentMessageId: null,
    replyCount: 0,
    latestReplyAt: null,
    attachments: [],
    reactions: [],
    mentions: [],
    senderDisplayName: "Alice Chen",
    senderAvatarUrl: "https://api.dicebear.com/9.x/thumbs/svg?seed=alice",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const basicMessage = msg({ id: "msg-1" as MessageId });

const withReactions = msg({
  id: "msg-2" as MessageId,
  content: "Ship it!",
  senderDisplayName: "Bob Park",
  senderAvatarUrl: "https://api.dicebear.com/9.x/thumbs/svg?seed=bob",
  userId: "u_bob" as UserId,
  reactions: [
    { emoji: "🚀", count: 3, userIds: ["u_alice" as UserId, "u_bob" as UserId, "u_carol" as UserId] },
    { emoji: "✅", count: 1, userIds: ["u_alice" as UserId] },
  ],
});

const withThread = msg({
  id: "msg-3" as MessageId,
  content: "Can someone review PR #42?",
  replyCount: 5,
  latestReplyAt: now,
});

const pinned = msg({
  id: "msg-4" as MessageId,
  content: "Team standup at 10am every day. Please be on time.",
  isPinned: true,
  senderDisplayName: "Carol Diaz",
  senderAvatarUrl: "https://api.dicebear.com/9.x/thumbs/svg?seed=carol",
  userId: "u_carol" as UserId,
});

const botMessage = msg({
  id: "msg-5" as MessageId,
  content: "Build #1234 passed on `main`. All 47 tests green.",
  senderDisplayName: "CI Bot",
  senderAvatarUrl: "https://api.dicebear.com/9.x/thumbs/svg?seed=cibot",
  userId: "u_cibot" as UserId,
  isBot: true,
});

export const messageItemStory: ComponentStory = {
  id: "message-item",
  name: "MessageItem",
  source: "components/message/MessageItem.tsx",
  render: () => (
    <>
      <VariantGrid title="Basic">
        <VariantItem label="default">
          <div className="w-[500px]">
            <MessageItem message={basicMessage} currentUserId={"u_viewer" as string} onToggleReaction={noop} />
          </div>
        </VariantItem>
      </VariantGrid>

      <VariantGrid title="With Reactions">
        <VariantItem label="two reactions">
          <div className="w-[500px]">
            <MessageItem message={withReactions} currentUserId={"u_alice" as string} onToggleReaction={noop} />
          </div>
        </VariantItem>
      </VariantGrid>

      <VariantGrid title="Thread Replies">
        <VariantItem label="5 replies">
          <div className="w-[500px]">
            <MessageItem message={withThread} currentUserId={"u_viewer" as string} onOpenThread={noop} onToggleReaction={noop} />
          </div>
        </VariantItem>
      </VariantGrid>

      <VariantGrid title="Pinned">
        <VariantItem label="pinned message">
          <div className="w-[500px]">
            <MessageItem message={pinned} currentUserId={"u_viewer" as string} onToggleReaction={noop} />
          </div>
        </VariantItem>
      </VariantGrid>

      <VariantGrid title="Bot Message">
        <VariantItem label="APP badge">
          <div className="w-[500px]">
            <MessageItem message={botMessage} currentUserId={"u_viewer" as string} onToggleReaction={noop} />
          </div>
        </VariantItem>
      </VariantGrid>

      <VariantGrid title="With Status Emoji">
        <VariantItem label="vacation">
          <div className="w-[500px]">
            <MessageItem message={basicMessage} currentUserId={"u_viewer" as string} senderStatusEmoji="🌴" onToggleReaction={noop} />
          </div>
        </VariantItem>
      </VariantGrid>
    </>
  ),
};
