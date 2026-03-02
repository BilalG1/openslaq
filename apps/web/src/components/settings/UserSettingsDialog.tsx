import { useState, useEffect } from "react";
import { useCurrentUser } from "../../hooks/useCurrentUser";
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
import { isTauri } from "../../lib/tauri";

type Tab = "profile" | "notifications" | "desktop";

interface UserSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserSettingsDialog({ open, onOpenChange }: UserSettingsDialogProps) {
  const user = useCurrentUser();
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  useEffect(() => {
    if (open && user) {
      setDisplayName(user.displayName ?? "");
      setActiveTab("profile");
    }
  }, [open, user]);

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
    await user.update?.({ profileImageUrl: base64Url });
    await authorizedRequest(user, (headers) =>
      api.api.users.me.$patch(
        { json: { avatarUrl: base64Url } },
        { headers },
      ),
    );
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "notifications", label: "Notifications" },
    ...(isTauri() ? [{ id: "desktop" as const, label: "Desktop" }] : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="p-0 max-h-[80vh] flex flex-col">
        <div className="px-6 pt-5 pb-4 border-b border-border-default shrink-0">
          <DialogTitle>Settings</DialogTitle>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Left nav */}
          <nav className="w-44 shrink-0 bg-surface-secondary border-r border-border-default p-3 flex flex-col gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "w-full text-left px-3 py-2 rounded-md text-sm border-none cursor-pointer transition-colors",
                  activeTab === tab.id
                    ? "bg-surface-selected text-primary font-medium"
                    : "bg-transparent text-muted hover:bg-surface-tertiary hover:text-primary",
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Right content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "profile" && (
              <div className="flex flex-col items-center gap-6">
                <ProfileImageEditor
                  currentImageUrl={user.profileImageUrl ?? null}
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
                  <div className="text-sm text-muted px-3 py-2 bg-surface-secondary rounded-lg" data-testid="settings-email">
                    {user.primaryEmail ?? ""}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <NotificationSettings />
            )}

            {activeTab === "desktop" && (
              <DesktopSettings />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
