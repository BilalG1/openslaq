import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Avatar } from "../ui";

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

export const MentionSuggestionList = forwardRef<MentionSuggestionListRef, MentionSuggestionListProps>(
  function MentionSuggestionList({ items, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const prevItemsRef = useRef(items);

    if (prevItemsRef.current !== items) {
      prevItemsRef.current = items;
      setSelectedIndex(0);
    }

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((prev) => (prev + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          const item = items[selectedIndex];
          if (item) command(item);
          return true;
        }
        return false;
      },
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
            {item.isGroup ? (
              <span className="w-6 h-6 rounded flex items-center justify-center bg-surface-secondary text-xs font-bold">
                @
              </span>
            ) : (
              <Avatar
                src={item.avatarUrl}
                fallback={item.displayName}
                size="sm"
                shape="rounded"
              />
            )}
            <span className="truncate">{item.displayName}</span>
            {item.id.startsWith("bot:") && (
              <span className="inline-flex items-center px-1 py-0 rounded text-[8px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 shrink-0">
                APP
              </span>
            )}
          </button>
        ))}
      </div>
    );
  },
);
