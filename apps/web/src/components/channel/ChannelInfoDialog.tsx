import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "../ui/dialog";
import { Avatar } from "../ui/avatar";
import { Tooltip } from "../ui/tooltip";
import { useChannelMembersApi, type ChannelMember } from "../../hooks/api/useChannelMembersApi";
import type { ChannelType, ChannelNotifyLevel } from "@openslaq/shared";
import type { PresenceEntry } from "../../state/chat-store";

interface ChannelInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
  channelName: string;
  channelType: ChannelType;
  description: string | null;
  createdAt: string;
  createdBy: string | null;
  memberCount: number;
  isArchived: boolean;
  isStarred: boolean;
  notificationLevel?: ChannelNotifyLevel;
  workspaceSlug: string;
  presence: Record<string, PresenceEntry>;
  onOpenProfile: (userId: string) => void;
  onToggleStar?: () => void;
  onSetNotificationLevel?: (level: ChannelNotifyLevel) => void;
}

export function ChannelInfoDialog({
  open,
  onOpenChange,
  channelId,
  channelName,
  channelType,
  description,
  createdAt,
  createdBy,
  memberCount,
  isArchived,
  isStarred,
  workspaceSlug,
  presence,
  onOpenProfile,
  onToggleStar,
  onSetNotificationLevel,
  notificationLevel,
}: ChannelInfoDialogProps) {
  const { listChannelMembers } = useChannelMembersApi();
  const [members, setMembers] = useState<ChannelMember[]>([]);

  const isPrivate = channelType === "private";

  const loadMembers = useCallback(async () => {
    const result = await listChannelMembers(workspaceSlug, channelId);
    setMembers(result);
  }, [workspaceSlug, channelId, listChannelMembers]);

  useEffect(() => {
    if (!open) {
      setMembers([]);
      return;
    }
    loadMembers();
  }, [open, loadMembers]);

  const formattedDate = new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const creatorMember = members.find((m) => m.id === createdBy);
  const onlineCount = members.filter((m) => presence[m.id]?.online).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[80vh]">
        <div className="overflow-y-auto flex-1 p-6">
          {/* Title row */}
          <div className="flex items-center justify-between mb-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-1.5">
              {isPrivate ? (
                <svg className="w-5 h-5 text-faint" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <span className="text-faint font-normal">#</span>
              )}
              {channelName}
              {isArchived && (
                <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-1.5 py-0.5 rounded font-medium ml-2">
                  Archived
                </span>
              )}
            </DialogTitle>
            {onToggleStar && (
              <button
                type="button"
                onClick={onToggleStar}
                className="bg-transparent border-none cursor-pointer p-1 hover:scale-110 transition-transform"
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
            )}
          </div>

          {/* Description */}
          {description && (
            <p className="text-sm text-secondary mb-5 m-0 leading-relaxed">{description}</p>
          )}

          {/* Stats cards row */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-lg border border-border-default p-3 text-center">
              <div className="text-2xl font-bold text-primary">{memberCount}</div>
              <div className="text-xs text-faint mt-0.5">Members</div>
              {onlineCount > 0 && (
                <div className="flex items-center justify-center gap-1 mt-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-green-600 dark:text-green-400">{onlineCount} online</span>
                </div>
              )}
            </div>
            <div className="rounded-lg border border-border-default p-3 text-center">
              <div className="text-sm font-semibold text-primary">{formattedDate}</div>
              <div className="text-xs text-faint mt-0.5">Created</div>
              {creatorMember && (
                <button
                  type="button"
                  className="text-xs text-link hover:underline bg-transparent border-none cursor-pointer p-0 mt-1"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenProfile(creatorMember.id);
                  }}
                >
                  {creatorMember.displayName}
                </button>
              )}
            </div>
            <div className="rounded-lg border border-border-default p-3 text-center">
              <div className="text-sm font-semibold text-primary flex items-center justify-center gap-1.5">
                {isPrivate ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="font-bold">#</span>
                )}
                {isPrivate ? "Private" : "Public"}
              </div>
              <div className="text-xs text-faint mt-0.5">Channel type</div>
            </div>
          </div>

          {/* Notification toggle row */}
          {onSetNotificationLevel && (
            <div className="mb-6">
              <div className="text-xs font-semibold text-faint uppercase tracking-wider mb-2">Notifications</div>
              <div className="inline-flex rounded-lg border border-border-default overflow-hidden">
                {(["all", "mentions", "muted"] as const).map((level) => {
                  const active = (!notificationLevel && level === "all") || notificationLevel === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => onSetNotificationLevel(level)}
                      className={`px-3 py-1.5 text-xs border-none cursor-pointer transition-colors ${
                        active
                          ? "bg-blue-500 text-white font-medium"
                          : "bg-transparent text-secondary hover:bg-hover"
                      }`}
                    >
                      {level === "all" ? "All" : level === "mentions" ? "Mentions" : "Muted"}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Members as avatar grid */}
          <div>
            <div className="text-xs font-semibold text-faint uppercase tracking-wider mb-3">
              Members ({memberCount})
            </div>
            <div className="flex flex-wrap gap-2">
              {members.map((member) => {
                const isOnline = presence[member.id]?.online ?? false;
                return (
                  <Tooltip key={member.id} content={member.displayName}>
                    <button
                      type="button"
                      className="relative bg-transparent border-none cursor-pointer p-0 hover:scale-110 transition-transform"
                      onClick={() => {
                        onOpenChange(false);
                        onOpenProfile(member.id);
                      }}
                    >
                      <Avatar src={member.avatarUrl} alt={member.displayName} fallback={member.displayName} size="lg" shape="circle" />
                      <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-surface ${isOnline ? "bg-green-500" : "bg-gray-400"}`} />
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
