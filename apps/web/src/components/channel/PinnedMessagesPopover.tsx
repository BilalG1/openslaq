import { useEffect, useRef } from "react";
import type { Message } from "@openslaq/shared";
import { Button, EmptyState, LoadingState } from "../ui";

interface PinnedMessagesPopoverProps {
  open: boolean;
  onClose: () => void;
  messages: Message[];
  loading: boolean;
  onJumpToMessage: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
}

export function PinnedMessagesPopover({
  open,
  onClose,
  messages,
  loading,
  onJumpToMessage,
  onUnpin,
}: PinnedMessagesPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      data-testid="pinned-messages-popover"
      className="absolute right-0 top-full mt-1 w-96 max-h-[400px] overflow-y-auto bg-surface border border-border-default rounded-lg shadow-lg z-50"
    >
      <div className="px-4 py-3 border-b border-border-default">
        <h3 className="font-semibold text-sm text-primary m-0">Pinned Messages</h3>
      </div>
      {loading ? (
        <LoadingState size="sm" />
      ) : messages.length === 0 ? (
        <EmptyState title="No pinned messages" size="sm" data-testid="pinned-empty" />
      ) : (
        <div className="divide-y divide-border-default">
          {messages.map((msg) => (
            <div key={msg.id} className="px-4 py-3 hover:bg-surface-secondary/50" data-testid={`pinned-item-${msg.id}`}>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-semibold text-sm text-primary">
                  {msg.senderDisplayName ?? msg.userId}
                </span>
                <span className="text-[11px] text-faint">
                  {new Date(msg.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-sm text-secondary m-0 mb-2 line-clamp-2">
                {msg.content}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid={`jump-to-pinned-${msg.id}`}
                  onClick={() => {
                    onJumpToMessage(msg.id);
                    onClose();
                  }}
                  className="text-xs text-slaq-blue"
                >
                  Jump to message
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid={`unpin-from-popover-${msg.id}`}
                  onClick={() => onUnpin(msg.id)}
                  className="text-xs text-faint"
                >
                  Unpin
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
