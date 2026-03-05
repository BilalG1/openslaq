import { useState, useRef, useEffect } from "react";
import type { ChannelType, HuddleState, ChannelNotifyLevel } from "@openslaq/shared";
import { ChannelMembersDialog } from "./ChannelMembersDialog";
import { HuddleHeaderButton } from "../huddle/HuddleHeaderButton";
import { Button, Tooltip, Dialog, DialogContent, DialogTitle } from "../ui";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import type { PresenceEntry } from "../../state/chat-store";

interface ChannelHeaderProps {
  channelName: string | null;
  channelId?: string;
  channelType?: ChannelType;
  channelCreatorId?: string | null;
  memberCount?: number;
  workspaceSlug?: string;
  presence?: Record<string, PresenceEntry>;
  onOpenProfile?: (userId: string) => void;
  activeHuddle?: HuddleState | null;
  currentHuddleChannelId?: string | null;
  onStartHuddle?: () => void;
  onJoinHuddle?: () => void;
  canManageMembers?: boolean;
  description?: string | null;
  onUpdateDescription?: (description: string | null) => void;
  isStarred?: boolean;
  onToggleStar?: () => void;
  pinnedCount?: number;
  onOpenPins?: () => void;
  onOpenFiles?: () => void;
  notificationLevel?: ChannelNotifyLevel;
  onSetNotificationLevel?: (level: ChannelNotifyLevel) => void;
  isArchived?: boolean;
  canArchive?: boolean;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onAddBookmark?: () => void;
  hasBookmarks?: boolean;
}

export function ChannelHeader({
  channelName,
  channelId,
  channelType,
  channelCreatorId,
  memberCount,
  workspaceSlug,
  presence,
  onOpenProfile,
  activeHuddle,
  currentHuddleChannelId,
  onStartHuddle,
  onJoinHuddle,
  canManageMembers,
  description,
  onUpdateDescription,
  isStarred,
  onToggleStar,
  pinnedCount,
  onOpenPins,
  onOpenFiles,
  notificationLevel,
  onSetNotificationLevel,
  isArchived,
  canArchive,
  onArchive,
  onUnarchive,
  onAddBookmark,
  hasBookmarks,
}: ChannelHeaderProps) {
  const [membersOpen, setMembersOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [topicDraft, setTopicDraft] = useState("");
  const topicInputRef = useRef<HTMLInputElement>(null);

  const isPrivate = channelType === "private";

  useEffect(() => {
    if (editingTopic && topicInputRef.current) {
      topicInputRef.current.focus();
    }
  }, [editingTopic]);

  function startEditingTopic() {
    setTopicDraft(description ?? "");
    setEditingTopic(true);
  }

  function saveTopic() {
    setEditingTopic(false);
    const trimmed = topicDraft.trim();
    const newDescription = trimmed.length > 0 ? trimmed : null;
    if (newDescription !== (description ?? null)) {
      onUpdateDescription?.(newDescription);
    }
  }

  function cancelTopic() {
    setEditingTopic(false);
  }

  return (
    <div className="px-4 py-3 border-b border-border-default min-h-[52px] flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <h2 className="font-bold text-lg m-0 text-primary shrink-0">
          {isPrivate ? (
            <span className="text-faint font-normal mr-1 inline-flex items-center">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" data-testid="private-channel-icon">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </span>
          ) : (
            <span className="text-faint font-normal mr-0.5">#</span>
          )}
          {channelName ?? "Channel"}
        </h2>

        {isArchived && (
          <span data-testid="archived-badge" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-1.5 py-0.5 rounded font-medium">
            Archived
          </span>
        )}

        {onToggleStar && (
          <Tooltip content={isStarred ? "Unstar channel" : "Star channel"}>
            <button
              type="button"
              data-testid="star-channel-button"
              onClick={onToggleStar}
              className="bg-transparent border-none cursor-pointer p-0.5 text-lg leading-none hover:scale-110 transition-transform"
              aria-label={isStarred ? "Unstar channel" : "Star channel"}
            >
              {isStarred ? (
                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-faint hover:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              )}
            </button>
          </Tooltip>
        )}

        {onUpdateDescription && (
          <div className="min-w-0 flex-1 ml-2 border-l border-border-default pl-2">
            {editingTopic ? (
              <input
                ref={topicInputRef}
                data-testid="channel-topic-input"
                type="text"
                value={topicDraft}
                onChange={(e) => setTopicDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTopic();
                  if (e.key === "Escape") cancelTopic();
                }}
                onBlur={saveTopic}
                maxLength={500}
                placeholder="Add a topic"
                className="w-full bg-transparent border-none outline-none text-sm text-secondary placeholder:text-faint"
              />
            ) : (
              <button
                type="button"
                data-testid="channel-topic-button"
                onClick={startEditingTopic}
                className="bg-transparent border-none cursor-pointer p-0 text-sm text-left truncate max-w-[300px] hover:text-primary transition-colors"
              >
                {description ? (
                  <span className="text-secondary" data-testid="channel-topic-text">{description}</span>
                ) : (
                  <span className="text-faint" data-testid="channel-topic-placeholder">Add a topic</span>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-0.5">
        {channelId && onStartHuddle && onJoinHuddle && (
          <HuddleHeaderButton
            channelId={channelId}
            activeHuddle={activeHuddle ?? null}
            currentHuddleChannelId={currentHuddleChannelId ?? null}
            onStart={onStartHuddle}
            onJoin={onJoinHuddle}
          />
        )}

        {onOpenPins && (
          <Tooltip content="Pinned messages">
            <Button
              data-testid="pinned-messages-button"
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={onOpenPins}
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4.456.734a1.75 1.75 0 0 1 2.826.504l.613 1.327a3.08 3.08 0 0 0 2.084 1.707l2.454.584c1.332.317 1.8 1.972.832 2.94L11.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06L10 11.06l-2.204 2.205c-.968.968-2.623.5-2.94-.832l-.584-2.454a3.08 3.08 0 0 0-1.707-2.084l-1.327-.613a1.75 1.75 0 0 1-.504-2.826L4.456.734Z" />
              </svg>
              {(pinnedCount ?? 0) > 0 && <span data-testid="pinned-count">{pinnedCount}</span>}
            </Button>
          </Tooltip>
        )}

      {channelId && memberCount != null && (
        <>
          <Tooltip content="View members">
            <Button
              data-testid="channel-member-count"
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => setMembersOpen(true)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.5 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.98A7.465 7.465 0 0 1 14.5 16Z" />
              </svg>
              {memberCount}
            </Button>
          </Tooltip>
          <ChannelMembersDialog
            open={membersOpen}
            onOpenChange={setMembersOpen}
            channelId={channelId}
            workspaceSlug={workspaceSlug ?? ""}
            presence={presence ?? {}}
            onOpenProfile={onOpenProfile ?? (() => {})}
            channelType={channelType}
            canManageMembers={canManageMembers}
            channelCreatorId={channelCreatorId}
          />
        </>
      )}

      {/* Overflow kebab menu for secondary actions */}
      {(onSetNotificationLevel || onOpenFiles || (onAddBookmark && !hasBookmarks && !isArchived) || (canArchive && !isArchived && onArchive && channelName !== "general") || (canArchive && isArchived && onUnarchive)) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              data-testid="channel-overflow-menu"
              variant="ghost"
              size="sm"
              aria-label="More actions"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0 5.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm1.5 7a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z" />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onSetNotificationLevel && (
              <>
                <DropdownMenuItem
                  data-testid="notify-level-all"
                  onSelect={() => onSetNotificationLevel("all")}
                  className="flex items-center gap-2"
                >
                  <span className="w-4 text-center">{(!notificationLevel || notificationLevel === "all") ? "\u2713" : ""}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                  </svg>
                  All messages
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-testid="notify-level-mentions"
                  onSelect={() => onSetNotificationLevel("mentions")}
                  className="flex items-center gap-2"
                >
                  <span className="w-4 text-center">{notificationLevel === "mentions" ? "\u2713" : ""}</span>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 1 0-2.636 6.364M16.5 12V8.25" />
                  </svg>
                  Mentions only
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-testid="notify-level-muted"
                  onSelect={() => onSetNotificationLevel("muted")}
                  className="flex items-center gap-2"
                >
                  <span className="w-4 text-center">{notificationLevel === "muted" ? "\u2713" : ""}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.143 17.082a24.248 24.248 0 0 0 5.714 0m-7.03-12.583A8.966 8.966 0 0 1 12 3c4.97 0 9 3.582 9 8a8.948 8.948 0 0 1-1.174 4.416M3 3l18 18M10.5 21h3" />
                  </svg>
                  Muted
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {onOpenFiles && (
              <DropdownMenuItem
                data-testid="channel-files-button"
                onSelect={onOpenFiles}
                className="flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                Channel files
              </DropdownMenuItem>
            )}

            {onAddBookmark && !hasBookmarks && !isArchived && (
              <DropdownMenuItem
                data-testid="add-bookmark-button"
                onSelect={onAddBookmark}
                className="flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                </svg>
                Add bookmark
              </DropdownMenuItem>
            )}

            {canArchive && !isArchived && onArchive && channelName !== "general" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  data-testid="archive-channel-button"
                  onSelect={() => setArchiveConfirmOpen(true)}
                  className="flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                  </svg>
                  Archive channel
                </DropdownMenuItem>
              </>
            )}

            {canArchive && isArchived && onUnarchive && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  data-testid="unarchive-channel-button"
                  onSelect={onUnarchive}
                  className="flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                  </svg>
                  Unarchive channel
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Archive confirmation dialog (rendered outside dropdown) */}
      {canArchive && !isArchived && onArchive && channelName !== "general" && (
        <Dialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
          <DialogContent size="sm" className="p-4">
            <DialogTitle className="mb-3">Archive #{channelName}?</DialogTitle>
            <p className="text-sm text-secondary mb-4">
              Archived channels become read-only and are hidden from the sidebar. You can unarchive later.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setArchiveConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                data-testid="confirm-archive-button"
                variant="primary"
                size="sm"
                onClick={() => {
                  setArchiveConfirmOpen(false);
                  onArchive();
                }}
              >
                Archive
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      </div>
    </div>
  );
}
