import { useEffect, useState } from "react";
import { Smile, Settings, LogOut } from "lucide-react";
import { UserSettingsDialog } from "../settings/UserSettingsDialog";
import { SetStatusDialog } from "./SetStatusDialog";
import { useChatStore } from "../../state/chat-store";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { redirectToAuth } from "../../lib/auth";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";

function isStatusExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

interface CustomUserButtonProps {
  showUserInfo?: boolean;
}

export function CustomUserButton({ showUserInfo }: CustomUserButtonProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const user = useCurrentUser();
  const { state } = useChatStore();

  const userId = user?.id;
  const presence = userId ? state.presence[userId] : undefined;
  const hasStatus = presence && !isStatusExpired(presence.statusExpiresAt) && (presence.statusEmoji || presence.statusText);
  const statusLabel = hasStatus
    ? `${presence.statusEmoji ?? ""} ${presence.statusText ?? ""}`.trim()
    : "Set a status";

  useEffect(() => {
    const handler = () => setSettingsOpen(true);
    window.addEventListener("openslaq:open-settings", handler);
    return () => window.removeEventListener("openslaq:open-settings", handler);
  }, []);

  const displayName = user?.displayName || user?.primaryEmail || "User";
  const avatarUrl = user?.profileImageUrl;
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/10 outline-none text-left${showUserInfo ? " w-full" : ""}`}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-8 h-8 rounded-md object-cover shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-md bg-avatar-fallback-bg text-avatar-fallback-text flex items-center justify-center text-sm font-medium shrink-0">
                {initials}
              </div>
            )}
            {showUserInfo && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-inherit truncate">{displayName}</span>
                {hasStatus && (
                  <span className="text-xs text-text-muted truncate">{statusLabel}</span>
                )}
              </div>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-[220px]">
          <DropdownMenuItem onSelect={() => setStatusOpen(true)}>
            <div className="flex items-center gap-2">
              <Smile className="w-4 h-4 text-text-muted" />
              <span className="truncate">{statusLabel}</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-text-muted" />
              <span>Settings</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => redirectToAuth()}>
            <div className="flex items-center gap-2">
              <LogOut className="w-4 h-4 text-text-muted" />
              <span>Sign out</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <UserSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <SetStatusDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        currentEmoji={hasStatus ? (presence.statusEmoji ?? null) : null}
        currentText={hasStatus ? (presence.statusText ?? null) : null}
      />
    </>
  );
}
