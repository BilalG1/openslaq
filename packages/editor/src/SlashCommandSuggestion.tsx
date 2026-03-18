import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

export interface SlashCommandItem {
  name: string;
  description: string;
  usage: string;
  source: "builtin" | "bot" | "integration";
  botName?: string;
}

interface SlashCommandSuggestionListProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export interface SlashCommandSuggestionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export function handleSlashCommandKeyDown(
  event: { key: string },
  items: SlashCommandItem[],
  selectedIndex: number,
  setSelectedIndex: (updater: (prev: number) => number) => void,
  command: (item: SlashCommandItem) => void,
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

export const SlashCommandSuggestionList = forwardRef<
  SlashCommandSuggestionListRef,
  SlashCommandSuggestionListProps
>(function SlashCommandSuggestionList({ items, command }, ref) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) =>
      handleSlashCommandKeyDown(event, items, selectedIndex, setSelectedIndex, command),
  }));

  if (items.length === 0) return null;

  return (
    <div data-testid="slash-command-list" className="bg-surface border border-border-default rounded-lg shadow-lg overflow-hidden max-h-[300px] overflow-y-auto min-w-[300px]">
      {items.map((item, index) => (
        <button
          key={item.name}
          type="button"
          onClick={() => command(item)}
          className={`w-full flex flex-col gap-0.5 px-3 py-2 text-left cursor-pointer border-none ${
            index === selectedIndex
              ? "bg-slaq-blue/10 text-slaq-blue"
              : "bg-transparent text-primary hover:bg-surface-hover"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">/{item.name}</span>
            {item.source === "bot" && item.botName && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-secondary text-faint">
                {item.botName}
              </span>
            )}
          </div>
          <span className="text-xs text-faint truncate">{item.description}</span>
          {item.usage && (
            <span className="text-[11px] text-faint/70 font-mono truncate">{item.usage}</span>
          )}
        </button>
      ))}
    </div>
  );
});
