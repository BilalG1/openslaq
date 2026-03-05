import { useCallback, useEffect, useRef, useState } from "react";
import type { ChannelBookmark } from "@openslaq/shared";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../ui/dropdown-menu";

function getFaviconUrl(url: string): string {
  return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=16`;
}

interface BookmarksBarProps {
  bookmarks: ChannelBookmark[];
  isArchived: boolean;
  onAddBookmark: () => void;
  onRemoveBookmark: (bookmarkId: string) => void;
}

export function BookmarksBar({ bookmarks, isArchived, onAddBookmark, onRemoveBookmark }: BookmarksBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(bookmarks.length);

  const measureOverflow = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const children = Array.from(container.children).filter(
      (el) => el.getAttribute("data-bookmark-chip") === "true",
    );
    if (children.length === 0) {
      setVisibleCount(0);
      return;
    }

    const containerRight = container.getBoundingClientRect().right;
    // Reserve space for the overflow button (~80px) and add button (~120px)
    const reservedSpace = 200;
    const threshold = containerRight - reservedSpace;

    let count = 0;
    for (const child of children) {
      const rect = child.getBoundingClientRect();
      if (rect.right <= threshold) {
        count++;
      } else {
        break;
      }
    }
    setVisibleCount(Math.max(1, count));
  }, []);

  useEffect(() => {
    measureOverflow();
    const observer = new ResizeObserver(measureOverflow);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [measureOverflow, bookmarks.length]);

  if (bookmarks.length === 0) {
    return null;
  }

  const visibleBookmarks = bookmarks.slice(0, visibleCount);
  const overflowBookmarks = bookmarks.slice(visibleCount);

  return (
    <div
      data-testid="bookmarks-bar"
      className="px-4 py-1.5 border-b border-border-default flex items-center gap-1.5 min-h-[36px] overflow-hidden"
      ref={containerRef}
    >
      {bookmarks.map((bookmark) => (
        <BookmarkChip
          key={bookmark.id}
          bookmark={bookmark}
          hidden={!visibleBookmarks.includes(bookmark)}
          onRemove={onRemoveBookmark}
        />
      ))}

      {overflowBookmarks.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              data-testid="bookmarks-overflow-button"
              className="text-xs text-link hover:text-link-hover px-1.5 py-0.5 rounded hover:bg-surface-hover shrink-0"
            >
              +{overflowBookmarks.length} more
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {overflowBookmarks.map((bookmark) => (
              <DropdownMenuItem key={bookmark.id} asChild>
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <img
                    src={getFaviconUrl(bookmark.url)}
                    alt=""
                    className="w-4 h-4"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <span className="truncate">{bookmark.title}</span>
                </a>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {!isArchived && (
        <button
          type="button"
          data-testid="add-bookmark-button"
          onClick={onAddBookmark}
          className="text-xs text-link hover:text-link-hover px-1.5 py-0.5 rounded hover:bg-surface-hover flex items-center gap-1 shrink-0"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add bookmark
        </button>
      )}
    </div>
  );
}

function BookmarkChip({
  bookmark,
  hidden,
  onRemove,
}: {
  bookmark: ChannelBookmark;
  hidden: boolean;
  onRemove: (id: string) => void;
}) {
  return (
    <div
      data-bookmark-chip="true"
      data-testid={`bookmark-chip-${bookmark.id}`}
      className={`group flex items-center gap-1.5 text-xs px-2 py-1 rounded hover:bg-surface-hover shrink-0 ${hidden ? "invisible absolute" : ""}`}
    >
      <img
        src={getFaviconUrl(bookmark.url)}
        alt=""
        className="w-3.5 h-3.5"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
      <a
        href={bookmark.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-link hover:text-link-hover hover:underline truncate max-w-[200px]"
        data-testid={`bookmark-link-${bookmark.id}`}
      >
        {bookmark.title}
      </a>
      <button
        type="button"
        data-testid={`bookmark-remove-${bookmark.id}`}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(bookmark.id);
        }}
        className="hidden group-hover:inline-flex items-center justify-center w-4 h-4 text-faint hover:text-danger-text rounded"
        aria-label={`Remove bookmark ${bookmark.title}`}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
