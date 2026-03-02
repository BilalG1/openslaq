import type { ReactionGroup, UserId } from "@openslaq/shared";
import { ReactionBar } from "../../components/message/ReactionBar";
import { VariantGrid, VariantItem } from "../ShowcaseSection";
import type { ComponentStory } from "../showcase-registry";

const currentUserId = "u_viewer" as string;
const noop = () => {};

const singleReaction: ReactionGroup[] = [
  { emoji: "👍", count: 2, userIds: ["u_alice" as UserId, "u_bob" as UserId] },
];

const activeReaction: ReactionGroup[] = [
  { emoji: "🎉", count: 3, userIds: ["u_viewer" as UserId, "u_alice" as UserId, "u_bob" as UserId] },
];

const multipleReactions: ReactionGroup[] = [
  { emoji: "🚀", count: 4, userIds: ["u_alice" as UserId, "u_bob" as UserId, "u_carol" as UserId, "u_dave" as UserId] },
  { emoji: "👀", count: 2, userIds: ["u_viewer" as UserId, "u_alice" as UserId] },
  { emoji: "❤️", count: 1, userIds: ["u_carol" as UserId] },
  { emoji: "✅", count: 5, userIds: ["u_alice" as UserId, "u_bob" as UserId, "u_carol" as UserId, "u_dave" as UserId, "u_viewer" as UserId] },
];

export const reactionBarStory: ComponentStory = {
  id: "reaction-bar",
  name: "ReactionBar",
  source: "components/message/ReactionBar.tsx",
  render: () => (
    <>
      <VariantGrid title="Single Reaction">
        <VariantItem label="not active">
          <div className="w-[400px]">
            <ReactionBar reactions={singleReaction} currentUserId={currentUserId} onToggleReaction={noop} />
          </div>
        </VariantItem>
      </VariantGrid>

      <VariantGrid title="Active (User Reacted)">
        <VariantItem label="highlighted border">
          <div className="w-[400px]">
            <ReactionBar reactions={activeReaction} currentUserId={currentUserId} onToggleReaction={noop} />
          </div>
        </VariantItem>
      </VariantGrid>

      <VariantGrid title="Multiple Reactions">
        <VariantItem label="4 emojis">
          <div className="w-[400px]">
            <ReactionBar reactions={multipleReactions} currentUserId={currentUserId} onToggleReaction={noop} />
          </div>
        </VariantItem>
      </VariantGrid>
    </>
  ),
};
