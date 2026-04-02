import { useState } from "react";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useCurrentUserProfile } from "../../hooks/useCurrentUserProfile";
import clsx from "clsx";
import { api } from "../../api";
import { authorizedRequest } from "../../lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  Input,
} from "../ui";
import { ProfileImageEditor } from "./ProfileImageEditor";
import { NotificationSettings } from "./NotificationSettings";
import { DesktopSettings } from "./DesktopSettings";
import { ApiKeysManager } from "./ApiKeysManager";
import { isTauri } from "../../lib/tauri";
import { User, Bell, Key, Monitor, Palette } from "lucide-react";
import { useTheme, type ThemeMode } from "../../theme/ThemeProvider";

type Tab = "profile" | "notifications" | "appearance" | "api-keys" | "desktop";

interface UserSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tabMeta: Record<Tab, { label: string; icon: typeof User; description: string }> = {
  profile: { label: "Profile", icon: User, description: "Manage your name, photo, and email" },
  notifications: { label: "Notifications", icon: Bell, description: "Control how you get notified" },
  appearance: { label: "Appearance", icon: Palette, description: "Customize the look and feel" },
  "api-keys": { label: "API Keys", icon: Key, description: "Manage your API access tokens" },
  desktop: { label: "Desktop", icon: Monitor, description: "Configure desktop app behavior" },
};

export function UserSettingsDialog({ open, onOpenChange }: UserSettingsDialogProps) {
  const user = useCurrentUser();
  const { profile, refresh: refreshProfile } = useCurrentUserProfile();
  const { mode, setMode } = useTheme();
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [prevOpen, setPrevOpen] = useState(false);

  if (open && !prevOpen && user) {
    setDisplayName(user.displayName ?? "");
    setActiveTab("profile");
  }
  if (open !== prevOpen) {
    setPrevOpen(open);
  }

  if (!user) return null;

  const handleSaveDisplayName = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      await user.update?.({ displayName: displayName.trim() });
      await authorizedRequest(user, (headers) =>
        api.api.users.me.$patch(
          { json: { displayName: displayName.trim() } },
          { headers },
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfileImage = async (base64Url: string) => {
    await authorizedRequest(user, (headers) =>
      api.api.users.me.$patch(
        { json: { avatarUrl: base64Url } },
        { headers },
      ),
    );
    await refreshProfile();
    // Also update Stack Auth so the OAuth profile stays in sync
    await user.update?.({ profileImageUrl: base64Url });
  };

  const tabs: Tab[] = [
    "profile",
    "notifications",
    "appearance",
    "api-keys",
    ...(isTauri() ? ["desktop" as const] : []),
  ];

  const activeMeta = tabMeta[activeTab];
  const ActiveIcon = activeMeta.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-h-[90vh] w-[720px] flex flex-col">
        <div className="px-6 pt-5 pb-4 border-b border-border-default shrink-0">
          <DialogTitle>Settings</DialogTitle>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Wide sidebar */}
          <nav className="w-56 shrink-0 bg-surface-secondary border-r border-border-default p-4 flex flex-col gap-4">
            {/* Nav items with icons */}
            <div className="flex flex-col gap-0.5">
              {tabs.map((tabId) => {
                const meta = tabMeta[tabId];
                const Icon = meta.icon;
                return (
                  <button
                    key={tabId}
                    type="button"
                    onClick={() => setActiveTab(tabId)}
                    className={clsx(
                      "w-full text-left px-3 py-2 rounded-md text-sm border-none cursor-pointer transition-colors flex items-center gap-2.5",
                      activeTab === tabId
                        ? "bg-surface-selected text-primary font-medium"
                        : "bg-transparent text-muted hover:bg-surface-tertiary hover:text-primary",
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Right content with heading */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <ActiveIcon className="w-5 h-5 text-muted" />
                <h2 className="text-lg font-semibold text-primary m-0">{activeMeta.label}</h2>
              </div>
              <p className="text-sm text-muted m-0">{activeMeta.description}</p>
            </div>

            <div className="bg-surface-secondary rounded-xl p-5">
              {activeTab === "profile" && (
                <div className="flex flex-col items-center gap-6">
                  <ProfileImageEditor
                    currentImageUrl={profile?.avatarUrl ?? null}
                    displayName={user.displayName ?? ""}
                    onSave={handleSaveProfileImage}
                  />

                  <div className="w-full flex flex-col gap-1">
                    <label htmlFor="settings-display-name" className="text-sm font-medium text-secondary">
                      Display name
                    </label>
                    <div className="flex gap-2">
                      <Input
                        id="settings-display-name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="flex-1"
                        data-testid="settings-display-name"
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveDisplayName}
                        disabled={saving || !displayName.trim() || displayName.trim() === (user.displayName ?? "")}
                        data-testid="settings-save-name"
                      >
                        {saving ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>

                  <div className="w-full flex flex-col gap-1">
                    <label className="text-sm font-medium text-secondary">Email</label>
                    <div className="text-sm text-muted px-3 py-2 bg-surface rounded-lg" data-testid="settings-email">
                      {user.primaryEmail ?? ""}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "notifications" && (
                <NotificationSettings />
              )}

              {activeTab === "appearance" && (
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-medium text-secondary">Theme</label>
                  <div className="flex gap-2">
                    {(["light", "dark"] as ThemeMode[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMode(m)}
                        className={clsx(
                          "px-4 py-2 rounded-lg text-sm font-medium border cursor-pointer transition-colors capitalize",
                          mode === m
                            ? "bg-surface-selected text-primary border-slaq-blue"
                            : "bg-surface text-secondary border-border-default hover:bg-surface-hover",
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "api-keys" && (
                <ApiKeysManager />
              )}

              {activeTab === "desktop" && (
                <DesktopSettings />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
