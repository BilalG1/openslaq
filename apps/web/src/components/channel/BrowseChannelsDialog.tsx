import { useState, useEffect, useMemo } from "react";
import { Search, Check, MoreHorizontal, Lock, LogIn, LogOut, Archive, Plus } from "lucide-react";
import type { Channel } from "@openslaq/shared";
import { DEFAULT_CHANNELS } from "@openslaq/shared";
import {
  browseChannels,
  joinChannel,
  leaveChannel,
  archiveChannel,
  type BrowseChannel,
} from "@openslaq/client-core";
import { useOperationDeps } from "../../hooks/chat/useOperationDeps";
import { useSocket } from "../../hooks/useSocket";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  Input,
  Badge,
  LoadingState,
  EmptyState,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../ui";
import { CreateChannelDialog } from "./CreateChannelDialog";

interface BrowseChannelsDialogProps {
  open: boolean;
  onClose: () => void;
  workspaceSlug: string;
  onChannelJoined?: (channel: Channel) => void;
  isAdmin?: boolean;
}

export function BrowseChannelsDialog({
  open,
  onClose,
  workspaceSlug,
  onChannelJoined,
  isAdmin = false,
}: BrowseChannelsDialogProps) {
  const deps = useOperationDeps();
  const { socket } = useSocket();
  const [channels, setChannels] = useState<BrowseChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSearch("");
    browseChannels(deps, workspaceSlug)
      .then(setChannels)
      .catch(() => setChannels([]))
      .finally(() => setLoading(false));
  }, [open, deps, workspaceSlug]);

  const filtered = useMemo(() => {
    if (!search.trim()) return channels;
    const q = search.toLowerCase();
    return channels.filter((ch) => ch.name.toLowerCase().includes(q));
  }, [channels, search]);

  const handleJoin = async (ch: BrowseChannel) => {
    setJoiningId(ch.id);
    try {
      await joinChannel(deps, { workspaceSlug, channelId: ch.id, socket });
      setChannels((prev) =>
        prev.map((c) => (c.id === ch.id ? { ...c, isMember: true } : c)),
      );
      onChannelJoined?.(ch);
    } finally {
      setJoiningId(null);
    }
  };

  const handleLeave = async (ch: BrowseChannel) => {
    await leaveChannel(deps, { workspaceSlug, channelId: ch.id, socket });
    setChannels((prev) =>
      prev.map((c) => (c.id === ch.id ? { ...c, isMember: false } : c)),
    );
  };

  const handleArchive = async (ch: BrowseChannel) => {
    await archiveChannel(deps, { workspaceSlug, channelId: ch.id });
    setChannels((prev) => prev.filter((c) => c.id !== ch.id));
  };

  const isGeneral = (ch: BrowseChannel) =>
    ch.name === DEFAULT_CHANNELS.GENERAL && ch.type === "public";

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
        <DialogContent size="lg" className="p-0 flex flex-col max-h-[70vh]">
          <div className="p-4 pb-0">
            <div className="flex items-center justify-between mb-3">
              <DialogTitle>Browse channels</DialogTitle>
              <Button
                variant="primary"
                size="sm"
                data-testid="browse-create-channel-btn"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Create channel
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                data-testid="browse-channels-search"
                placeholder="Search channels..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 pt-3">
            {loading ? (
              <LoadingState size="sm" />
            ) : filtered.length === 0 ? (
              <EmptyState size="sm" title={search ? "No channels match your search" : "No channels"} />
            ) : (
              <div className="grid grid-cols-2 gap-3" data-testid="browse-channels-list">
                {filtered.map((ch) => (
                  <div
                    key={ch.id}
                    className="relative border border-border-default rounded-lg p-4 flex flex-col hover:border-primary/50 transition-colors"
                    data-testid={`browse-channel-row-${ch.id}`}
                  >
                    {/* Top-right area: joined indicator or kebab menu */}
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      {ch.isMember && (
                        <div
                          className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
                          data-testid={`browse-channel-joined-${ch.id}`}
                        >
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="w-6 h-6 rounded flex items-center justify-center text-faint hover:text-primary hover:bg-hover cursor-pointer bg-transparent border-none"
                            data-testid={`browse-channel-menu-${ch.id}`}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!ch.isMember && (
                            <DropdownMenuItem
                              onSelect={() => void handleJoin(ch)}
                              className="flex items-center gap-2"
                              data-testid={`browse-channel-menu-join-${ch.id}`}
                            >
                              <LogIn className="w-4 h-4" />
                              Join channel
                            </DropdownMenuItem>
                          )}
                          {ch.isMember && !isGeneral(ch) && (
                            <DropdownMenuItem
                              onSelect={() => void handleLeave(ch)}
                              className="flex items-center gap-2"
                              data-testid={`browse-channel-menu-leave-${ch.id}`}
                            >
                              <LogOut className="w-4 h-4" />
                              Leave channel
                            </DropdownMenuItem>
                          )}
                          {isAdmin && !isGeneral(ch) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={() => void handleArchive(ch)}
                                className="flex items-center gap-2 text-danger-text"
                                data-testid={`browse-channel-menu-archive-${ch.id}`}
                              >
                                <Archive className="w-4 h-4" />
                                Archive channel
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <span className="font-semibold text-sm mb-1 flex items-center gap-1">
                      {ch.type === "private" ? (
                        <Lock className="w-3 h-3 text-faint" data-testid={`browse-channel-private-${ch.id}`} />
                      ) : (
                        "#"
                      )}
                      {" "}{ch.name}
                    </span>
                    {ch.description && (
                      <p className="text-xs text-secondary line-clamp-2 mb-2">{ch.description}</p>
                    )}
                    <div className="mt-auto pt-2 flex items-center justify-between">
                      <Badge variant="gray" size="sm">{ch.memberCount ?? 0} members</Badge>
                      {!ch.isMember && (
                        <Button
                          variant="primary"
                          size="sm"
                          data-testid={`browse-channel-join-${ch.id}`}
                          onClick={() => void handleJoin(ch)}
                          disabled={joiningId === ch.id}
                        >
                          {joiningId === ch.id ? "Joining..." : "Join"}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CreateChannelDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        workspaceSlug={workspaceSlug}
        canCreatePrivate={isAdmin}
        onChannelCreated={(channel) => {
          setCreateOpen(false);
          setChannels((prev) => [
            ...prev,
            { ...channel, isMember: true, memberCount: 1 },
          ]);
          onChannelJoined?.(channel);
        }}
      />
    </>
  );
}
