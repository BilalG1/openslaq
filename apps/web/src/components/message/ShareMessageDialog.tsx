import { useState } from "react";
import type { Message, Channel } from "@openslaq/shared";
import { Dialog, DialogContent, DialogTitle } from "../ui";
import { MessageContent } from "./MessageContent";

interface ShareMessageDialogProps {
  open: boolean;
  onClose: () => void;
  message: Message | null;
  channels: Channel[];
  dmChannelNames: Map<string, string>;
  onShare: (destinationChannelId: string, comment: string) => void;
}

export function ShareMessageDialog({
  open,
  onClose,
  message,
  channels,
  dmChannelNames,
  onShare,
}: ShareMessageDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [prevOpen, setPrevOpen] = useState(false);

  if (!open && prevOpen) {
    setSearch("");
    setSelectedChannelId(null);
    setComment("");
  }
  if (open !== prevOpen) {
    setPrevOpen(open);
  }

  if (!message) return null;

  const filteredChannels = search.trim()
    ? channels.filter((ch) => {
        const name = ch.type === "dm" || ch.type === "group_dm"
          ? dmChannelNames.get(ch.id) ?? ch.displayName ?? ch.name
          : ch.name;
        return name.toLowerCase().includes(search.toLowerCase());
      })
    : channels;

  const getChannelLabel = (ch: Channel) => {
    if (ch.type === "dm" || ch.type === "group_dm") {
      return dmChannelNames.get(ch.id) ?? ch.displayName ?? ch.name;
    }
    return `#${ch.name}`;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent size="sm" className="max-h-[500px] overflow-hidden p-4 flex flex-col">
        <DialogTitle className="mb-3">Share message</DialogTitle>

        {/* Message preview */}
        <div className="border border-border-default rounded-md p-3 mb-3 bg-surface-secondary/30">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="font-semibold text-xs text-primary">
              {message.senderDisplayName ?? message.userId}
            </span>
            <span className="text-[10px] text-faint">
              {new Date(message.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            </span>
          </div>
          {message.content && (
            <div className="text-sm text-primary line-clamp-3">
              <MessageContent content={message.content} mentions={message.mentions ?? []} />
            </div>
          )}
        </div>

        {/* Comment */}
        <textarea
          placeholder="Add a comment (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full px-3 py-2 mb-2 rounded border border-border-default bg-surface text-primary text-sm outline-none focus:border-slaq-blue resize-none"
          rows={2}
          data-testid="share-comment-input"
        />

        {/* Search */}
        <input
          type="text"
          placeholder="Search channels..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 mb-2 rounded border border-border-default bg-surface text-primary text-sm outline-none focus:border-slaq-blue"
          data-testid="share-channel-search"
        />

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {filteredChannels.map((ch) => {
            const isSelected = selectedChannelId === ch.id;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => setSelectedChannelId(ch.id)}
                className={`block w-full py-2 px-3 border-none cursor-pointer text-left text-sm rounded text-primary hover:bg-surface-hover ${
                  isSelected ? "bg-surface-hover" : "bg-transparent"
                }`}
                data-testid={`share-channel-${ch.id}`}
              >
                {getChannelLabel(ch)}
              </button>
            );
          })}
        </div>

        {/* Share button */}
        {selectedChannelId && (
          <button
            type="button"
            onClick={() => {
              onShare(selectedChannelId, comment);
              onClose();
            }}
            className="mt-3 w-full py-2 rounded bg-slaq-blue text-white font-medium text-sm border-none cursor-pointer hover:bg-slaq-blue/90"
            data-testid="share-confirm-button"
          >
            Share
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}
