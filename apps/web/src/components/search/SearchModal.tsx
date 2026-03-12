import { useEffect, useRef, useState, useCallback } from "react";
import type { SearchResultItem as SearchResultItemType, Channel } from "@openslaq/shared";
import { SearchResultItem } from "./SearchResultItem";
import { useSearch } from "../../hooks/chat/useSearch";
import type { DmConversation } from "../../state/chat-store";
import { Dialog, DialogContent, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui";
import { useGalleryMode, useGalleryMockData } from "../../gallery/gallery-context";

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  onNavigateToMessage: (result: SearchResultItemType) => void;
  workspaceSlug: string | undefined;
}

const ALL_CHANNELS = "__all__";

export function SearchModal({ open, onClose, onNavigateToMessage, workspaceSlug }: SearchModalProps) {
  const { filters, updateFilters, results, total, loading, error, loadMore, hasMore, reset, channels, dms } =
    useSearch(workspaceSlug);
  const isGallery = useGalleryMode();
  const galleryMockData = useGalleryMockData();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setSelectedIndex(0);
      reset();
      const timer = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(timer);
    }
  }, [open, reset]);

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

  // Scroll selected item into view
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

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent
        size="lg"
        position="top"
        className="max-h-[65vh]"
        data-testid="search-modal"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border-default">
          <svg className="w-5 h-5 text-faint shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
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

        {/* Filter bar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border-secondary text-xs">
          <Select
            value={filters.channelId ?? ALL_CHANNELS}
            onValueChange={(v) => updateFilters({ channelId: v === ALL_CHANNELS ? undefined : v })}
          >
            <SelectTrigger size="sm" data-testid="search-filter-channel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CHANNELS}>All channels</SelectItem>
              {allChannels.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto"
          onScroll={handleScroll}
          data-testid="search-results"
        >
          {!filters.q.trim() ? (
            <div className="flex items-center justify-center h-32 text-faint text-sm">
              Type to search...
            </div>
          ) : loading && results.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-faint text-sm">
              Searching...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-32 text-danger-text text-sm">
              {error}
            </div>
          ) : results.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-faint text-sm" data-testid="search-no-results">
              No results found
            </div>
          ) : (
            <>
              <div className="px-3 py-1.5 text-xs text-muted border-b border-border-secondary">
                {total} result{total !== 1 ? "s" : ""}
              </div>
              {results.map((result, i) => (
                <SearchResultItem
                  key={result.messageId}
                  result={result}
                  isSelected={i === selectedIndex}
                  onClick={() => handleSelect(result)}
                />
              ))}
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
