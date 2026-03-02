import { MessageActionBar } from "../../components/message/MessageActionBar";
import { VariantGrid, VariantItem } from "../ShowcaseSection";
import type { ComponentStory } from "../showcase-registry";

const noop = () => {};

export const messageActionBarStory: ComponentStory = {
  id: "message-action-bar",
  name: "MessageActionBar",
  source: "components/message/MessageActionBar.tsx",
  render: () => (
    <>
      <VariantGrid title="Minimal (reactions only)">
        <VariantItem label="default">
          <div className="relative w-[400px] h-12 pt-4">
            <MessageActionBar onAddReaction={noop} />
          </div>
        </VariantItem>
      </VariantGrid>

      <VariantGrid title="With Thread">
        <VariantItem label="reply button">
          <div className="relative w-[400px] h-12 pt-4">
            <MessageActionBar onAddReaction={noop} onOpenThread={noop} />
          </div>
        </VariantItem>
      </VariantGrid>

      <VariantGrid title="Own Message (edit + delete)">
        <VariantItem label="all actions">
          <div className="relative w-[400px] h-12 pt-4">
            <MessageActionBar
              onAddReaction={noop}
              onOpenThread={noop}
              isOwnMessage
              onEditMessage={noop}
              onDeleteMessage={noop}
              onMarkAsUnread={noop}
              onPinMessage={noop}
              onShareMessage={noop}
              onSaveMessage={noop}
            />
          </div>
        </VariantItem>
      </VariantGrid>

      <VariantGrid title="Pinned + Saved">
        <VariantItem label="pinned & saved state">
          <div className="relative w-[400px] h-12 pt-4">
            <MessageActionBar
              onAddReaction={noop}
              onOpenThread={noop}
              isOwnMessage
              onEditMessage={noop}
              onDeleteMessage={noop}
              onMarkAsUnread={noop}
              onUnpinMessage={noop}
              onUnsaveMessage={noop}
              isPinned
              isSaved
            />
          </div>
        </VariantItem>
      </VariantGrid>
    </>
  ),
};
