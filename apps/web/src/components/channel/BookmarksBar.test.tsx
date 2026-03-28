import { describe, test, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "../../test-utils";
import { BookmarksBar } from "./BookmarksBar";
import type { ChannelBookmark } from "@openslaq/shared";
import { asBookmarkId } from "@openslaq/shared";

afterEach(cleanup);

const mockBookmark = (overrides: Partial<ChannelBookmark> = {}): ChannelBookmark => ({
  id: asBookmarkId("bm-1"),
  channelId: "ch-1" as ChannelBookmark["channelId"],
  url: "https://example.com",
  title: "Example",
  createdBy: "user-1" as ChannelBookmark["createdBy"],
  createdAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("BookmarksBar", () => {
  test("renders bookmarks", () => {
    const bookmarks = [
      mockBookmark({ id: asBookmarkId("bm-1"), url: "https://example.com", title: "Example" }),
      mockBookmark({ id: asBookmarkId("bm-2"), url: "https://docs.com", title: "Docs" }),
    ];

    render(
      <BookmarksBar
        bookmarks={bookmarks}
        isArchived={false}
        onAddBookmark={() => {}}
        onRemoveBookmark={() => {}}
      />,
    );

    expect(screen.getByTestId("bookmarks-bar")).toBeDefined();
    expect(screen.getByText("Example")).toBeDefined();
    expect(screen.getByText("Docs")).toBeDefined();
  });

  test("shows add bookmark button when not archived and has bookmarks", () => {
    render(
      <BookmarksBar
        bookmarks={[mockBookmark()]}
        isArchived={false}
        onAddBookmark={() => {}}
        onRemoveBookmark={() => {}}
      />,
    );

    expect(screen.getByTestId("add-bookmark-button")).toBeDefined();
  });

  test("hides add bookmark button when archived", () => {
    render(
      <BookmarksBar
        bookmarks={[mockBookmark()]}
        isArchived={true}
        onAddBookmark={() => {}}
        onRemoveBookmark={() => {}}
      />,
    );

    expect(screen.queryByTestId("add-bookmark-button")).toBeNull();
  });

  test("returns null when no bookmarks regardless of archive status", () => {
    const { container: archivedContainer } = render(
      <BookmarksBar
        bookmarks={[]}
        isArchived={true}
        onAddBookmark={() => {}}
        onRemoveBookmark={() => {}}
      />,
    );
    expect(archivedContainer.innerHTML).toBe("");

    cleanup();

    const { container: activeContainer } = render(
      <BookmarksBar
        bookmarks={[]}
        isArchived={false}
        onAddBookmark={() => {}}
        onRemoveBookmark={() => {}}
      />,
    );
    expect(activeContainer.innerHTML).toBe("");
  });

  test("calls onRemoveBookmark when remove button clicked", () => {
    const onRemove = vi.fn();
    const bookmarks = [mockBookmark({ id: asBookmarkId("bm-1") })];

    render(
      <BookmarksBar
        bookmarks={bookmarks}
        isArchived={false}
        onAddBookmark={() => {}}
        onRemoveBookmark={onRemove}
      />,
    );

    screen.getByTestId("bookmark-remove-bm-1").click();
    expect(onRemove).toHaveBeenCalledWith("bm-1");
  });

  test("calls onAddBookmark when add button clicked", () => {
    const onAdd = vi.fn();

    render(
      <BookmarksBar
        bookmarks={[mockBookmark()]}
        isArchived={false}
        onAddBookmark={onAdd}
        onRemoveBookmark={() => {}}
      />,
    );

    screen.getByTestId("add-bookmark-button").click();
    expect(onAdd).toHaveBeenCalled();
  });

  test("bookmark links open in new tab", () => {
    const bookmarks = [mockBookmark({ id: asBookmarkId("bm-1") })];

    render(
      <BookmarksBar
        bookmarks={bookmarks}
        isArchived={false}
        onAddBookmark={() => {}}
        onRemoveBookmark={() => {}}
      />,
    );

    const link = screen.getByTestId("bookmark-link-bm-1");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });
});
