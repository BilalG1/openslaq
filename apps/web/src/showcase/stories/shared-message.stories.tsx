import type { SharedMessageInfo, MessageId, ChannelId, UserId } from "@openslaq/shared";
import { SharedMessageBlock } from "../../components/message/SharedMessageBlock";
import { VariantGrid, VariantItem } from "../ShowcaseSection";
import type { ComponentStory } from "../showcase-registry";

const now = new Date().toISOString();

const basicShared: SharedMessageInfo = {
  id: "msg-shared-1" as MessageId,
  channelId: "ch_general" as ChannelId,
  channelName: "general",
  channelType: "public",
  userId: "u_alice" as UserId,
  senderDisplayName: "Alice Chen",
  senderAvatarUrl: "https://api.dicebear.com/9.x/thumbs/svg?seed=alice",
  content: "The new release is out! Please test it on staging.",
  createdAt: now,
};

const longContent: SharedMessageInfo = {
  id: "msg-shared-2" as MessageId,
  channelId: "ch_engineering" as ChannelId,
  channelName: "engineering",
  channelType: "public",
  userId: "u_bob" as UserId,
  senderDisplayName: "Bob Park",
  senderAvatarUrl: "https://api.dicebear.com/9.x/thumbs/svg?seed=bob",
  content:
    "We need to migrate the database before the next deploy. The migration script is in `scripts/migrate.ts` and should be run with `bun run db:migrate`. Make sure to back up the database first. Let me know if you have any questions about the process.",
  createdAt: now,
};

const noAvatar: SharedMessageInfo = {
  id: "msg-shared-3" as MessageId,
  channelId: "ch_random" as ChannelId,
  channelName: "random",
  channelType: "public",
  userId: "u_carol" as UserId,
  senderDisplayName: "Carol Diaz",
  senderAvatarUrl: null,
  content: "Anyone up for lunch?",
  createdAt: now,
};

export const sharedMessageStory: ComponentStory = {
  id: "shared-message",
  name: "SharedMessageBlock",
  source: "components/message/SharedMessageBlock.tsx",
  render: () => (
    <>
      <VariantGrid title="Variants">
        <VariantItem label="basic">
          <div className="w-[500px]">
            <SharedMessageBlock sharedMessage={basicShared} />
          </div>
        </VariantItem>
        <VariantItem label="long content">
          <div className="w-[500px]">
            <SharedMessageBlock sharedMessage={longContent} />
          </div>
        </VariantItem>
        <VariantItem label="no avatar">
          <div className="w-[500px]">
            <SharedMessageBlock sharedMessage={noAvatar} />
          </div>
        </VariantItem>
      </VariantGrid>
    </>
  ),
};
