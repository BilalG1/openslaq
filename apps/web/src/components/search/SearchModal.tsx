import { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from "react";
import type { SearchResultItem as SearchResultItemType, Channel } from "@openslaq/shared";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSearch } from "../../hooks/chat/useSearch";
import type { DmConversation } from "../../state/chat-store";
import { Search } from "lucide-react";
import { Dialog, DialogContent, LoadingState, ErrorState, EmptyState } from "../ui";
import { useGalleryMode, useGalleryMockData } from "../../gallery/gallery-context";

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  onNavigateToMessage: (result: SearchResultItemType) => void;
  workspaceSlug: string | undefined;
}

const ALL_CHANNELS = "__all__";

function HighlightedText({ html }: { html: string }) {
  const parts = useMemo(() => {
    const segments: { text: string; highlighted: boolean }[] = [];
    const regex = /<mark>(.*?)<\/mark>/gi;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ text: stripTags(html.slice(lastIndex, match.index)), highlighted: false });
      }
      segments.push({ text: stripTags(match[1]!), highlighted: true });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < html.length) {
      segments.push({ text: stripTags(html.slice(lastIndex)), highlighted: false });
    }
    return segments;
  }, [html]);

  return (
    <>
      {parts.map((part, i) => {
        const rendered = (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={inlineComponents}>
            {part.text}
          </ReactMarkdown>
        );
        return part.highlighted ? (
          <mark key={i} className="bg-mark-bg rounded-sm px-0.5">{rendered}</mark>
        ) : (
          <span key={i}>{rendered}</span>
        );
      })}
    </>
  );
}

const inlineComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
};

function stripTags(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}

export function SearchModal({ open, onClose, onNavigateToMessage, workspaceSlug }: SearchModalProps) {
  const { filters, updateFilters, results, total, loading, error, loadMore, hasMore, reset, channels, dms } =
    useSearch(workspaceSlug);
  const isGallery = useGalleryMode();
  const galleryMockData = useGalleryMockData();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeTab, setActiveTab] = useState(ALL_CHANNELS);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [prevOpen, setPrevOpen] = useState(false);

  if (open && !prevOpen) {
    setSelectedIndex(0);
    setActiveTab(ALL_CHANNELS);
    reset();
  }
  if (open !== prevOpen) {
    setPrevOpen(open);
  }

  useLayoutEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !isGallery) return;
    const prefillQuery = galleryMockData?.search?.prefillQuery?.trim();
    if (!prefillQuery) return;
    updateFilters({ q: prefillQuery });
  }, [galleryMockData?.search?.prefillQuery, isGallery, open, updateFilters]);

  const handleSelect = useCallback(
    (result: SearchResultItemType) => {
      onNavigateToMessage(result);
      onClose();
    },
    [onNavigateToMessage, onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (results.length === 0) return;
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (results.length === 0) return;
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      }
    },
    [results, selectedIndex, handleSelect],
  );

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 100 && hasMore && !loading) {
        loadMore();
      }
    },
    [hasMore, loading, loadMore],
  );

  const allChannels: { id: string; label: string }[] = [
    ...channels.map((c: Channel) => ({ id: c.id, label: `#${c.name}` })),
    ...dms.map((dm: DmConversation) => ({ id: dm.channel.id, label: `DM: ${dm.otherUser.displayName}` })),
  ];

  const handleTabChange = (channelId: string) => {
    setActiveTab(channelId);
    updateFilters({ channelId: channelId === ALL_CHANNELS ? undefined : channelId });
    setSelectedIndex(0);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent
        size="lg"
        position="top"
        className="max-h-[75vh]"
        data-testid="search-modal"
        onKeyDown={handleKeyDown}
      >
        {/* Floating search bar */}
        <div className="mx-4 mt-4 mb-2 px-4 py-3 bg-surface-secondary rounded-lg">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-faint shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search messages..."
              value={filters.q}
              onChange={(e) => {
                updateFilters({ q: e.target.value });
                setSelectedIndex(0);
              }}
              className="flex-1 border-none outline-none text-sm bg-transparent text-primary"
              data-testid="search-input"
            />
            <kbd className="hidden sm:inline text-xs text-faint bg-surface-tertiary px-1.5 py-0.5 rounded">ESC</kbd>
          </div>
        </div>

        {/* Horizontal scrollable pill tabs */}
        <div className="flex items-center gap-1.5 px-4 py-2 overflow-x-auto no-scrollbar" data-testid="search-filter-channel">
          <button
            type="button"
            onClick={() => handleTabChange(ALL_CHANNELS)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border-none cursor-pointer transition-colors ${
              activeTab === ALL_CHANNELS
                ? "bg-slaq-blue text-white"
                : "bg-surface-tertiary text-secondary hover:bg-surface-hover"
            }`}
          >
            All
          </button>
          {allChannels.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleTabChange(c.id)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border-none cursor-pointer transition-colors ${
                activeTab === c.id
                  ? "bg-slaq-blue text-white"
                  : "bg-surface-tertiary text-secondary hover:bg-surface-hover"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-3 pb-3"
          onScroll={handleScroll}
          data-testid="search-results"
        >
          {!filters.q.trim() ? (
            <EmptyState title="Type to search..." size="sm" />
          ) : loading && results.length === 0 ? (
            <LoadingState label="Searching..." size="sm" />
          ) : error ? (
            <ErrorState message={error} size="sm" />
          ) : results.length === 0 ? (
            <EmptyState title="No results found" size="sm" data-testid="search-no-results" />
          ) : (
            <>
              <div className="px-1 py-1.5 text-xs text-muted">
                {total} result{total !== 1 ? "s" : ""}
              </div>
              {results.map((result, i) => {
                const isPrivate = result.channelType === "private";
                const channelLabel =
                  result.channelType === "dm" ? "DM" : `${isPrivate ? "" : "#"}${result.channelName}`;
                const time = new Date(result.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={result.messageId}
                    onClick={() => handleSelect(result)}
                    className={`mx-0 my-1.5 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                      i === selectedIndex
                        ? "border-slaq-blue ring-1 ring-slaq-blue/20 bg-surface"
                        : "border-border-secondary bg-surface hover:border-border-default"
                    }`}
                  >
                    {/* Content */}
                    <div className="text-sm text-primary line-clamp-3 mb-2">
                      <HighlightedText html={result.headline} />
                    </div>
                    {/* Metadata footer */}
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <span className="font-medium text-secondary">{channelLabel}</span>
                      <span className="text-faint">-</span>
                      <span>{result.userDisplayName}</span>
                      <span className="text-faint">-</span>
                      <span>{time}</span>
                      {result.parentMessageId && (
                        <span className="bg-surface-tertiary text-muted px-1.5 py-0.5 rounded text-[10px]">
                          in thread
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {loading && (
                <div className="flex items-center justify-center py-3 text-faint text-xs">
                  Loading more...
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
