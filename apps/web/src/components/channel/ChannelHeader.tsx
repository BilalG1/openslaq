import { useState, useRef, useEffect } from "react";
import { Check, Info, Lock, Star, Users, MoreHorizontal, Bell, AtSign, BellOff, Pin, FileText, Bookmark, Archive, ArchiveRestore, LogOut } from "lucide-react";
import type { ChannelType, HuddleState, ChannelNotifyLevel } from "@openslaq/shared";
import { ChannelMembersDialog } from "./ChannelMembersDialog";
import { ChannelInfoDialog } from "./ChannelInfoDialog";
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
  channelCreatedAt?: string;
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
  onLeaveChannel?: () => void;
}

export function ChannelHeader({
  channelName,
  channelId,
  channelType,
  channelCreatorId,
  channelCreatedAt,
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
  onLeaveChannel,
}: ChannelHeaderProps) {
  const [membersOpen, setMembersOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [topicDraft, setTopicDraft] = useState("");
  const topicInputRef = useRef<HTMLInputElement>(null);

  const isPrivate = channelType === "private";
  const canModifyChannel = channelName !== null && channelName !== "general";

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
        {onToggleStar && (
          <Tooltip content={isStarred ? "Unstar channel" : "Star channel"}>
            <button
              type="button"
              data-testid="star-channel-button"
              onClick={onToggleStar}
              className="bg-transparent border border-border-default rounded cursor-pointer p-0.5 text-lg leading-none hover:scale-110 transition-transform"
              aria-label={isStarred ? "Unstar channel" : "Star channel"}
            >
              {isStarred ? (
                <Star className="w-5 h-5 text-yellow-400" fill="currentColor" />
              ) : (
                <Star className="w-5 h-5 text-faint hover:text-yellow-400" />
              )}
            </button>
          </Tooltip>
        )}

        <button
          type="button"
          onClick={() => setInfoOpen(true)}
          className="font-bold text-lg m-0 text-primary shrink-0 bg-transparent border-none cursor-pointer p-0 hover:underline"
          data-testid="channel-name-button"
        >
          {isPrivate ? (
            <span className="text-faint font-normal mr-1 inline-flex items-center">
              <Lock className="w-4 h-4" data-testid="private-channel-icon" />
            </span>
          ) : (
            <span className="text-faint font-normal mr-0.5">#</span>
          )}
          {channelName ?? "Channel"}
        </button>

        {isArchived && (
          <span data-testid="archived-badge" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-1.5 py-0.5 rounded font-medium">
            Archived
          </span>
        )}

        {onUpdateDescription && (description || editingTopic) && (
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

      <div className="flex items-center gap-1">
        {channelId && onStartHuddle && onJoinHuddle && (
          <HuddleHeaderButton
            channelId={channelId}
            activeHuddle={activeHuddle ?? null}
            currentHuddleChannelId={currentHuddleChannelId ?? null}
            onStart={onStartHuddle}
            onJoin={onJoinHuddle}
          />
        )}

      {channelId && memberCount !== undefined && (
        <>
          <Tooltip content="View members">
              <button
                type="button"
                data-testid="channel-member-count"
                onClick={() => setMembersOpen(true)}
                className="relative w-8 h-8 flex items-center justify-center rounded-md border border-border-default text-muted hover:bg-surface-tertiary hover:border-border-strong hover:text-primary transition-all cursor-pointer bg-transparent"
              >
                <Users className="w-[18px] h-[18px]" />
                {memberCount > 0 && (
                  <span className="absolute -bottom-0.5 -right-0.5 text-[9px] bg-slaq-blue text-white rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 leading-none font-medium">
                    {memberCount}
                  </span>
                )}
              </button>
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
      {(onSetNotificationLevel || onOpenPins || onOpenFiles || (onAddBookmark && !hasBookmarks && !isArchived) || (canArchive && !isArchived && onArchive && canModifyChannel) || (canArchive && isArchived && onUnarchive) || (onLeaveChannel && canModifyChannel)) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              data-testid="channel-overflow-menu"
              aria-label="More actions"
              className="w-8 h-8 flex items-center justify-center rounded-md border border-border-default text-muted hover:bg-surface-tertiary hover:border-border-strong hover:text-primary transition-all cursor-pointer bg-transparent"
            >
              <MoreHorizontal className="w-[18px] h-[18px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              data-testid="channel-details-button"
              onSelect={() => setInfoOpen(true)}
              className="flex items-center gap-2"
            >
              <Info className="w-4 h-4" />
              Channel Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {onSetNotificationLevel && (
              <>
                <DropdownMenuItem
                  data-testid="notify-level-all"
                  onSelect={() => onSetNotificationLevel("all")}
                  className="flex items-center gap-2"
                >
                  <span className="w-4 text-center">{(!notificationLevel || notificationLevel === "all") ? <Check size={14} /> : ""}</span>
                  <Bell className="w-4 h-4" />
                  All messages
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-testid="notify-level-mentions"
                  onSelect={() => onSetNotificationLevel("mentions")}
                  className="flex items-center gap-2"
                >
                  <span className="w-4 text-center">{notificationLevel === "mentions" ? <Check size={14} /> : ""}</span>
                  <AtSign className="w-4 h-4" />
                  Mentions only
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-testid="notify-level-muted"
                  onSelect={() => onSetNotificationLevel("muted")}
                  className="flex items-center gap-2"
                >
                  <span className="w-4 text-center">{notificationLevel === "muted" ? <Check size={14} /> : ""}</span>
                  <BellOff className="w-4 h-4" />
                  Muted
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {onOpenPins && (
              <DropdownMenuItem
                data-testid="pinned-messages-button"
                onSelect={onOpenPins}
                className="flex items-center gap-2"
              >
                <Pin className="w-4 h-4" />
                Pinned messages
                {(pinnedCount ?? 0) > 0 && (
                  <span data-testid="pinned-count" className="ml-auto text-[11px] bg-slaq-blue text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none font-medium">
                    {pinnedCount}
                  </span>
                )}
              </DropdownMenuItem>
            )}

            {onOpenFiles && (
              <DropdownMenuItem
                data-testid="channel-files-button"
                onSelect={onOpenFiles}
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Channel files
              </DropdownMenuItem>
            )}

            {onAddBookmark && !hasBookmarks && !isArchived && (
              <DropdownMenuItem
                data-testid="add-bookmark-button"
                onSelect={onAddBookmark}
                className="flex items-center gap-2"
              >
                <Bookmark className="w-4 h-4" />
                Add bookmark
              </DropdownMenuItem>
            )}

            {onLeaveChannel && canModifyChannel && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  data-testid="leave-channel-button"
                  onSelect={onLeaveChannel}
                  className="flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Leave channel
                </DropdownMenuItem>
              </>
            )}

            {canArchive && !isArchived && onArchive && canModifyChannel && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  data-testid="archive-channel-button"
                  onSelect={() => setArchiveConfirmOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Archive className="w-4 h-4" />
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
                  <ArchiveRestore className="w-4 h-4" />
                  Unarchive channel
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Channel info dialog */}
      {channelId && channelType && (
        <ChannelInfoDialog
          open={infoOpen}
          onOpenChange={setInfoOpen}
          channelName={channelName ?? "Channel"}
          channelType={channelType}
          description={description ?? null}
          createdAt={channelCreatedAt ?? new Date().toISOString()}
          memberCount={memberCount ?? 0}
          isArchived={isArchived ?? false}
          isStarred={isStarred ?? false}
          notificationLevel={notificationLevel}
          onToggleStar={onToggleStar}
          onSetNotificationLevel={onSetNotificationLevel}
          onUpdateDescription={onUpdateDescription}
        />
      )}

      {/* Archive confirmation dialog (rendered outside dropdown) */}
      {canArchive && !isArchived && onArchive && canModifyChannel && (
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
