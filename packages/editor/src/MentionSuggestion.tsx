import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

export interface MentionSuggestionItem {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  isGroup?: boolean;
}

interface MentionSuggestionListProps {
  items: MentionSuggestionItem[];
  command: (item: MentionSuggestionItem) => void;
}

export interface MentionSuggestionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

function AvatarFallback({ item }: { item: MentionSuggestionItem }) {
  if (item.isGroup) {
    return (
      <span className="w-6 h-6 rounded flex items-center justify-center bg-surface-secondary text-xs font-bold">
        @
      </span>
    );
  }

  const initials = item.displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

  if (item.avatarUrl) {
    return <img src={item.avatarUrl} alt={item.displayName} className="w-6 h-6 rounded" />;
  }

  return (
    <span className="w-6 h-6 rounded flex items-center justify-center bg-surface-secondary text-xs font-bold">
      {initials}
    </span>
  );
}

export function handleMentionKeyDown(
  event: { key: string },
  items: MentionSuggestionItem[],
  selectedIndex: number,
  setSelectedIndex: (updater: (prev: number) => number) => void,
  command: (item: MentionSuggestionItem) => void,
): boolean {
  if (event.key === "ArrowUp") {
    setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
    return true;
  }
  if (event.key === "ArrowDown") {
    setSelectedIndex((prev) => (prev + 1) % items.length);
    return true;
  }
  if (event.key === "Enter" || event.key === "Tab") {
    const item = items[selectedIndex];
    if (item) command(item);
    return true;
  }
  return false;
}

export const MentionSuggestionList = forwardRef<MentionSuggestionListRef, MentionSuggestionListProps>(
  function MentionSuggestionList({ items, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => handleMentionKeyDown(event, items, selectedIndex, setSelectedIndex, command),
    }));

    if (items.length === 0) return null;

    return (
      <div className="bg-surface border border-border-default rounded-lg shadow-lg overflow-hidden max-h-[240px] overflow-y-auto min-w-[220px]">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => command(item)}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left cursor-pointer border-none ${
              index === selectedIndex
                ? "bg-slaq-blue/10 text-slaq-blue"
                : "bg-transparent text-primary hover:bg-surface-hover"
            }`}
          >
            <AvatarFallback item={item} />
            <span className="truncate">{item.displayName}</span>
          </button>
        ))}
      </div>
    );
  },
);
