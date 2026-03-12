import type { ChannelBookmark, ChannelId, UserId } from "@openslaq/shared";
import { asBookmarkId } from "@openslaq/shared";
import { BookmarksBar } from "../../components/channel/BookmarksBar";
import { VariantGrid, VariantItem } from "../ShowcaseSection";
import type { ComponentStory } from "../showcase-registry";

const noop = () => {};

function bookmark(id: string, title: string, url: string): ChannelBookmark {
  return {
    id: asBookmarkId(id),
    channelId: "ch_showcase" as ChannelId,
    url,
    title,
    createdBy: "u_alice" as UserId,
    createdAt: new Date().toISOString(),
  };
}

const fewBookmarks: ChannelBookmark[] = [
  bookmark("b1", "Project Docs", "https://docs.example.com"),
  bookmark("b2", "Figma Designs", "https://figma.com/file/abc123"),
  bookmark("b3", "CI Dashboard", "https://github.com/org/repo/actions"),
];

const manyBookmarks: ChannelBookmark[] = [
  bookmark("b1", "Project Docs", "https://docs.example.com"),
  bookmark("b2", "Figma Designs", "https://figma.com/file/abc123"),
  bookmark("b3", "CI Dashboard", "https://github.com/org/repo/actions"),
  bookmark("b4", "Sentry Errors", "https://sentry.io/org/project"),
  bookmark("b5", "Linear Board", "https://linear.app/team/board"),
  bookmark("b6", "Notion Wiki", "https://notion.so/wiki"),
  bookmark("b7", "Slack Archive", "https://slack.com/archives"),
  bookmark("b8", "API Reference", "https://api.example.com/docs"),
];

export const bookmarksBarStory: ComponentStory = {
  id: "bookmarks-bar",
  name: "BookmarksBar",
  source: "components/channel/BookmarksBar.tsx",
  render: () => (
    <>
      <VariantGrid title="Empty">
        <VariantItem label="no bookmarks">
          <div className="w-[600px] border border-border-default rounded">
            <BookmarksBar bookmarks={[]} isArchived={false} onAddBookmark={noop} onRemoveBookmark={noop} />
          </div>
        </VariantItem>
      </VariantGrid>

      <VariantGrid title="Few Bookmarks">
        <VariantItem label="3 items">
          <div className="w-[600px] border border-border-default rounded">
            <BookmarksBar bookmarks={fewBookmarks} isArchived={false} onAddBookmark={noop} onRemoveBookmark={noop} />
          </div>
        </VariantItem>
      </VariantGrid>

      <VariantGrid title="Overflow">
        <VariantItem label="8 items in narrow container">
          <div className="w-[400px] border border-border-default rounded">
            <BookmarksBar bookmarks={manyBookmarks} isArchived={false} onAddBookmark={noop} onRemoveBookmark={noop} />
          </div>
        </VariantItem>
      </VariantGrid>

      <VariantGrid title="Archived">
        <VariantItem label="no add button">
          <div className="w-[600px] border border-border-default rounded">
            <BookmarksBar bookmarks={fewBookmarks} isArchived onAddBookmark={noop} onRemoveBookmark={noop} />
          </div>
        </VariantItem>
      </VariantGrid>
    </>
  ),
};
