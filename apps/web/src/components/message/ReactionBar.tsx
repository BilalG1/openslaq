import { useRef, useState } from "react";
import clsx from "clsx";
import type { ReactionGroup, CustomEmoji } from "@openslaq/shared";
import { parseCustomEmojiName, findCustomEmoji } from "@openslaq/client-core";
import emojiData from "@emoji-mart/data";
import { EmojiPicker } from "./EmojiPicker";

const emojiDataTyped = emojiData as {
  emojis: Record<string, { skins: { native: string }[] }>;
  aliases: Record<string, string>;
};

function shortcodeToNative(shortcode: string): string | undefined {
  const resolved = emojiDataTyped.aliases[shortcode] ?? shortcode;
  return emojiDataTyped.emojis[resolved]?.skins[0]?.native;
}

interface ReactionBarProps {
  reactions: ReactionGroup[];
  currentUserId: string;
  onToggleReaction: (emoji: string) => void;
  customEmojis?: CustomEmoji[];
}

function EmojiDisplay({ emoji, customEmojis }: { emoji: string; customEmojis?: CustomEmoji[] }) {
  const customName = parseCustomEmojiName(emoji);
  if (customName && customEmojis) {
    const found = findCustomEmoji(customName, customEmojis);
    if (found) {
      return <img src={found.url} alt={customName} className="inline w-5 h-5 align-text-bottom" />;
    }
    return <span title={`Unknown: ${customName}`}>:{customName}:</span>;
  }
  // If it's all ASCII, try shortcode-to-native conversion
  if (/^[a-z0-9_+-]+$/.test(emoji)) {
    const native = shortcodeToNative(emoji);
    if (native) return <span>{native}</span>;
  }
  return <span>{emoji}</span>;
}

export function ReactionBar({ reactions, currentUserId, onToggleReaction, customEmojis }: ReactionBarProps) {
  const [showPicker, setShowPicker] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  if (reactions.length === 0 && !showPicker) return null;

  return (
    <div
      data-testid="reaction-bar"
      className="flex flex-wrap gap-1 mt-1 items-center"
    >
      {reactions.map((r) => {
        const isActive = r.userIds.some((userId) => userId === currentUserId);
        return (
          <button
            key={r.emoji}
            data-testid={`reaction-pill-${r.emoji}`}
            onClick={() => onToggleReaction(r.emoji)}
            className={clsx(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-xl cursor-pointer text-[13px] leading-5",
              isActive
                ? "border border-slaq-blue bg-surface-selected"
                : "border border-border-default bg-surface-secondary",
            )}
          >
            <EmojiDisplay emoji={r.emoji} customEmojis={customEmojis} />
            <span className="text-[11px] text-muted">{r.count}</span>
          </button>
        );
      })}
      <button
        ref={addButtonRef}
        data-testid="reaction-add-button"
        onClick={() => setShowPicker(!showPicker)}
        className="inline-flex items-center justify-center w-7 h-7 rounded-xl border border-border-default bg-surface-secondary cursor-pointer text-sm p-0"
      >
        +
      </button>
      {showPicker && (
        <EmojiPicker
          anchorRef={addButtonRef}
          customEmojis={customEmojis?.map((e) => ({ id: e.id, name: e.name, url: e.url }))}
          onSelect={(emoji) => {
            onToggleReaction(emoji);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
