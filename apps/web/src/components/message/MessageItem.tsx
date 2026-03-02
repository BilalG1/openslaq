import { useState, useRef, useEffect } from "react";
import type { Message, CustomEmoji } from "@openslaq/shared";
import { MessageContent } from "./MessageContent";
import { MessageAttachments } from "./MessageAttachments";
import { MessageActions } from "./MessageActions";
import { LinkPreviewCard } from "./LinkPreviewCard";
import { SharedMessageBlock } from "./SharedMessageBlock";
import { ReactionBar } from "./ReactionBar";
import { MessageActionBar } from "./MessageActionBar";
import { Avatar, Button } from "../ui";

interface MessageItemProps {
  message: Message;
  currentUserId?: string;
  senderStatusEmoji?: string | null;
  isGrouped?: boolean;
  onOpenThread?: (messageId: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onOpenProfile?: (userId: string) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onMarkAsUnread?: (messageId: string) => void;
  onPinMessage?: (messageId: string) => void;
  onUnpinMessage?: (messageId: string) => void;
  onShareMessage?: (messageId: string) => void;
  onSaveMessage?: (messageId: string) => void;
  onUnsaveMessage?: (messageId: string) => void;
  isSaved?: boolean;
  onBotAction?: (messageId: string, actionId: string) => void;
  customEmojis?: CustomEmoji[];
}

export function MessageItem({
  message,
  currentUserId,
  senderStatusEmoji,
  isGrouped,
  onOpenThread,
  onToggleReaction,
  onOpenProfile,
  onEditMessage,
  onDeleteMessage,
  onMarkAsUnread,
  onPinMessage,
  onUnpinMessage,
  onShareMessage,
  onSaveMessage,
  onUnsaveMessage,
  isSaved,
  onBotAction,
  customEmojis,
}: MessageItemProps) {
  const isTopLevel = !message.parentMessageId;
  const displayName = message.senderDisplayName ?? message.userId;
  const isOwnMessage = Boolean(currentUserId && message.userId === currentUserId);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content ?? "");
  const editRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      editRef.current.setSelectionRange(editRef.current.value.length, editRef.current.value.length);
    }
  }, [isEditing]);

  const handleEditSave = () => {
    const trimmed = editContent.trim();
    if (trimmed && trimmed !== message.content && onEditMessage) {
      onEditMessage(message.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditContent(message.content ?? "");
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEditSave();
    } else if (e.key === "Escape") {
      handleEditCancel();
    }
  };

  const fullTime = new Date(message.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const compactTime = new Date(message.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: false });

  return (
    <div className={`${isGrouped ? "mb-1" : "mb-3"} relative group px-4 -mx-4 rounded hover:bg-surface-secondary/50`} data-message-id={message.id}>
      {onToggleReaction && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <MessageActionBar
            onAddReaction={(emoji) => onToggleReaction(message.id, emoji)}
            customEmojis={customEmojis?.map((e) => ({ id: e.id, name: e.name, url: e.url }))}
            onOpenThread={isTopLevel && onOpenThread ? () => onOpenThread(message.id) : undefined}
            isOwnMessage={isOwnMessage}
            onEditMessage={onEditMessage ? () => {
              setEditContent(message.content ?? "");
              setIsEditing(true);
            } : undefined}
            onDeleteMessage={onDeleteMessage ? () => onDeleteMessage(message.id) : undefined}
            onMarkAsUnread={onMarkAsUnread ? () => onMarkAsUnread(message.id) : undefined}
            onPinMessage={onPinMessage ? () => onPinMessage(message.id) : undefined}
            onUnpinMessage={onUnpinMessage ? () => onUnpinMessage(message.id) : undefined}
            onShareMessage={onShareMessage ? () => onShareMessage(message.id) : undefined}
            onSaveMessage={onSaveMessage ? () => onSaveMessage(message.id) : undefined}
            onUnsaveMessage={onUnsaveMessage ? () => onUnsaveMessage(message.id) : undefined}
            isPinned={message.isPinned}
            isSaved={isSaved}
          />
        </div>
      )}
      <div className="flex gap-2.5 items-start">
        {isGrouped ? (
          <div className="w-9 h-5 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] text-faint leading-none">{compactTime}</span>
          </div>
        ) : onOpenProfile && !message.isBot ? (
          <button
            type="button"
            data-testid={`message-avatar-${message.id}`}
            onClick={() => onOpenProfile(message.userId)}
            className="bg-transparent border-none p-0 cursor-pointer mt-0.5"
          >
            <Avatar
              src={message.senderAvatarUrl}
              fallback={displayName}
              size="md"
              shape="rounded"
            />
          </button>
        ) : (
          <Avatar
            src={message.senderAvatarUrl}
            fallback={displayName}
            size="md"
            shape="rounded"
            className="mt-0.5"
          />
        )}
        <div className="min-w-0 flex-1">
          {!isGrouped && (
          <div className="flex items-baseline gap-2">
            {onOpenProfile && !message.isBot ? (
              <button
                type="button"
                onClick={() => onOpenProfile(message.userId)}
                className="bg-transparent border-none p-0 font-semibold text-sm text-primary cursor-pointer hover:underline"
              >
                {displayName}
              </button>
            ) : (
              <span className="font-semibold text-sm text-primary">
                {displayName}
              </span>
            )}
            {senderStatusEmoji && (
              <span className="text-xs" data-testid={`msg-status-emoji-${message.id}`}>{senderStatusEmoji}</span>
            )}
            {message.isBot && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" data-testid="bot-badge">
                APP
              </span>
            )}
            <span className="text-[11px] text-faint">
              {fullTime}
            </span>
            {message.isPinned && (
              <span className="inline-flex items-center text-faint" data-testid="pin-badge" title="Pinned">
                <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4.456.734a1.75 1.75 0 0 1 2.826.504l.613 1.327a3.08 3.08 0 0 0 2.084 1.707l2.454.584c1.332.317 1.8 1.972.832 2.94L11.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06L10 11.06l-2.204 2.205c-.968.968-2.623.5-2.94-.832l-.584-2.454a3.08 3.08 0 0 0-1.707-2.084l-1.327-.613a1.75 1.75 0 0 1-.504-2.826L4.456.734Z" />
                </svg>
              </span>
            )}
          </div>
          )}
          {isEditing ? (
            <div className="mt-1">
              <textarea
                ref={editRef}
                data-testid="edit-message-input"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleEditKeyDown}
                className="w-full bg-surface border border-border-default rounded-md px-3 py-2 text-sm text-primary resize-none focus:outline-none focus:border-slaq-blue"
                rows={2}
              />
              <div className="flex gap-2 mt-1 text-xs text-faint">
                <span>Enter to save</span>
                <span>·</span>
                <span>Esc to cancel</span>
              </div>
            </div>
          ) : (
            <>
              {message.sharedMessage && (
                <SharedMessageBlock sharedMessage={message.sharedMessage} />
              )}
              {message.content && <MessageContent content={message.content} mentions={message.mentions} onOpenProfile={onOpenProfile} customEmojis={customEmojis} />}
              {message.attachments?.length > 0 && (
                <MessageAttachments attachments={message.attachments} />
              )}
              {message.linkPreviews?.map((p) => (
                <LinkPreviewCard key={p.url} preview={p} />
              ))}
              {onBotAction && message.actions && message.actions.length > 0 && (
                <MessageActions actions={message.actions} messageId={message.id} onAction={onBotAction} />
              )}
            </>
          )}
          {currentUserId && onToggleReaction && (
            <ReactionBar
              reactions={message.reactions ?? []}
              currentUserId={currentUserId}
              onToggleReaction={(emoji) => onToggleReaction(message.id, emoji)}
              customEmojis={customEmojis}
            />
          )}
          {isTopLevel && onOpenThread && message.replyCount > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <Button
                variant="ghost"
                size="sm"
                data-testid={`thread-replies-${message.id}`}
                onClick={() => onOpenThread(message.id)}
                className="text-slaq-blue p-0 font-semibold"
              >
                {message.replyCount} {message.replyCount === 1 ? "reply" : "replies"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
