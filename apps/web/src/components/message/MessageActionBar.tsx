import { useEffect, useRef, useState } from "react";
import { EmojiPicker, type CustomEmojiItem } from "./EmojiPicker";
import { Button, Tooltip } from "../ui";
import { Smile, MessageSquare, MoreVertical, Mail, Pin, Share2, Bookmark, Pencil, Trash2 } from "lucide-react";

interface MessageActionBarProps {
  onAddReaction: (emoji: string) => void;
  customEmojis?: CustomEmojiItem[];
  onOpenThread?: () => void;
  onEditMessage?: () => void;
  onDeleteMessage?: () => void;
  onMarkAsUnread?: () => void;
  onPinMessage?: () => void;
  onUnpinMessage?: () => void;
  onShareMessage?: () => void;
  onSaveMessage?: () => void;
  onUnsaveMessage?: () => void;
  isPinned?: boolean;
  isSaved?: boolean;
  isOwnMessage?: boolean;
}

export function MessageActionBar({
  onAddReaction,
  customEmojis,
  onOpenThread,
  onEditMessage,
  onDeleteMessage,
  onMarkAsUnread,
  onPinMessage,
  onUnpinMessage,
  onShareMessage,
  onSaveMessage,
  onUnsaveMessage,
  isPinned,
  isSaved,
  isOwnMessage,
}: MessageActionBarProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(e.target as Node)
      ) {
        setShowMenu(false);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  const quickReactions = ["✅", "👀", "🙌"];

  return (
    <div
      data-testid="message-action-bar"
      className="absolute -top-2 right-2 flex gap-0.5 bg-surface border border-border-default rounded-md p-0.5 shadow-sm"
    >
      {quickReactions.map((emoji) => (
        <Tooltip key={emoji} content={`React with ${emoji}`}>
          <Button
            variant="ghost"
            size="icon"
            data-testid={`quick-react-${emoji}`}
            onClick={() => onAddReaction(emoji)}
            className="text-base leading-none"
          >
            {emoji}
          </Button>
        </Tooltip>
      ))}
      <Tooltip content="Add reaction">
        <Button
          ref={emojiButtonRef}
          variant="ghost"
          size="icon"
          data-testid="reaction-trigger"
          onClick={() => setShowPicker(!showPicker)}
          className="text-base leading-none"
        >
        <Smile className="w-4 h-4 text-muted" />
      </Button>
      </Tooltip>
      {showPicker && (
        <EmojiPicker
          anchorRef={emojiButtonRef}
          customEmojis={customEmojis}
          onSelect={(emoji) => {
            onAddReaction(emoji);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
      {onOpenThread && (
        <Tooltip content="Reply in thread">
          <Button
            variant="ghost"
            size="icon"
            data-testid="reply-action-trigger"
            onClick={onOpenThread}
            className="text-base leading-none"
          >
            <MessageSquare className="w-4 h-4 text-muted" />
          </Button>
        </Tooltip>
      )}
      {(onMarkAsUnread || onPinMessage || onUnpinMessage || onShareMessage || onSaveMessage || onUnsaveMessage || (isOwnMessage && (onEditMessage || onDeleteMessage))) && (
        <div className="relative">
          <Tooltip content="More actions">
            <Button
              ref={menuButtonRef}
              variant="ghost"
              size="icon"
              data-testid="message-overflow-menu"
              onClick={() => setShowMenu(!showMenu)}
              className="text-base leading-none"
            >
              <MoreVertical className="w-4 h-4 text-muted" />
            </Button>
          </Tooltip>
          {showMenu && (
            <div
              ref={menuRef}
              data-testid="message-overflow-dropdown"
              className="absolute right-0 top-full mt-1 bg-surface border border-border-default rounded-md shadow-lg py-1 z-50 min-w-[160px]"
            >
              {onMarkAsUnread && (
                <button
                  type="button"
                  data-testid="mark-unread-action"
                  onClick={() => {
                    setShowMenu(false);
                    onMarkAsUnread();
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-primary hover:bg-surface-secondary cursor-pointer bg-transparent border-none flex items-center gap-2"
                >
                  <Mail className="w-4 h-4 shrink-0" />
                  Mark as unread
                </button>
              )}
              {isPinned && onUnpinMessage && (
                <button
                  type="button"
                  data-testid="unpin-message-action"
                  onClick={() => {
                    setShowMenu(false);
                    onUnpinMessage();
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-primary hover:bg-surface-secondary cursor-pointer bg-transparent border-none flex items-center gap-2"
                >
                  <Pin className="w-4 h-4 shrink-0" />
                  Unpin message
                </button>
              )}
              {!isPinned && onPinMessage && (
                <button
                  type="button"
                  data-testid="pin-message-action"
                  onClick={() => {
                    setShowMenu(false);
                    onPinMessage();
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-primary hover:bg-surface-secondary cursor-pointer bg-transparent border-none flex items-center gap-2"
                >
                  <Pin className="w-4 h-4 shrink-0" />
                  Pin message
                </button>
              )}
              {onShareMessage && (
                <button
                  type="button"
                  data-testid="share-message-action"
                  onClick={() => {
                    setShowMenu(false);
                    onShareMessage();
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-primary hover:bg-surface-secondary cursor-pointer bg-transparent border-none flex items-center gap-2"
                >
                  <Share2 className="w-4 h-4 shrink-0" />
                  Share message
                </button>
              )}
              {isSaved && onUnsaveMessage && (
                <button
                  type="button"
                  data-testid="unsave-message-action"
                  onClick={() => {
                    setShowMenu(false);
                    onUnsaveMessage();
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-primary hover:bg-surface-secondary cursor-pointer bg-transparent border-none flex items-center gap-2"
                >
                  <Bookmark className="w-4 h-4 shrink-0" fill="currentColor" />
                  Remove from saved
                </button>
              )}
              {!isSaved && onSaveMessage && (
                <button
                  type="button"
                  data-testid="save-message-action"
                  onClick={() => {
                    setShowMenu(false);
                    onSaveMessage();
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-primary hover:bg-surface-secondary cursor-pointer bg-transparent border-none flex items-center gap-2"
                >
                  <Bookmark className="w-4 h-4 shrink-0" />
                  Save for later
                </button>
              )}
              {isOwnMessage && onEditMessage && (
                <button
                  type="button"
                  data-testid="edit-message-action"
                  onClick={() => {
                    setShowMenu(false);
                    onEditMessage();
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-primary hover:bg-surface-secondary cursor-pointer bg-transparent border-none flex items-center gap-2"
                >
                  <Pencil className="w-4 h-4 shrink-0" />
                  Edit message
                </button>
              )}
              {isOwnMessage && onDeleteMessage && (
                <button
                  type="button"
                  data-testid="delete-message-action"
                  onClick={() => {
                    setShowMenu(false);
                    setShowDeleteConfirm(true);
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-danger-text hover:bg-surface-secondary cursor-pointer bg-transparent border-none flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  Delete message
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {showDeleteConfirm && (
        <div
          data-testid="delete-confirm-dialog"
          className="absolute right-0 top-full mt-1 bg-surface border border-border-default rounded-md shadow-lg p-3 z-50 min-w-[220px]"
        >
          <p className="text-sm text-primary mb-2">Delete this message?</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1 text-sm rounded bg-transparent border border-border-default cursor-pointer text-primary hover:bg-surface-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              data-testid="confirm-delete-button"
              onClick={() => {
                setShowDeleteConfirm(false);
                onDeleteMessage?.();
              }}
              className="px-3 py-1 text-sm rounded bg-red-600 text-white border-none cursor-pointer hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
