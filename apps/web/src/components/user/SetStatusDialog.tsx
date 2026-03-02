import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../ui";
import {
  STATUS_PRESETS,
  DURATION_OPTIONS,
  DURATION_LABELS,
  durationToExpiresAt,
  setUserStatus,
  clearUserStatus,
  handleUserStatusUpdated,
  type DurationOption,
} from "@openslaq/client-core";
import { api } from "../../api";
import { useAuthProvider } from "../../lib/api-client";
import { useChatStore } from "../../state/chat-store";
import { useCurrentUser } from "../../hooks/useCurrentUser";

interface SetStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmoji?: string | null;
  currentText?: string | null;
}

export function SetStatusDialog({
  open,
  onOpenChange,
  currentEmoji,
  currentText,
}: SetStatusDialogProps) {
  const auth = useAuthProvider();
  const { dispatch } = useChatStore();
  const user = useCurrentUser();
  const [emoji, setEmoji] = useState(currentEmoji ?? "");
  const [text, setText] = useState(currentText ?? "");
  const [duration, setDuration] = useState<DurationOption>("dont_clear");
  const [saving, setSaving] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setEmoji(currentEmoji ?? "");
      setText(currentText ?? "");
      setDuration("dont_clear");
    }
    onOpenChange(isOpen);
  };

  const handlePreset = (preset: (typeof STATUS_PRESETS)[number]) => {
    setEmoji(preset.emoji);
    setText(preset.text);
    setDuration(preset.duration);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await setUserStatus({ api, auth }, {
        emoji: emoji || undefined,
        text: text || undefined,
        expiresAt: durationToExpiresAt(duration),
      });
      if (user?.id) {
        dispatch(handleUserStatusUpdated({
          userId: user.id,
          statusEmoji: result.statusEmoji,
          statusText: result.statusText,
          statusExpiresAt: result.statusExpiresAt,
        }));
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await clearUserStatus({ api, auth });
      if (user?.id) {
        dispatch(handleUserStatusUpdated({
          userId: user.id,
          statusEmoji: null,
          statusText: null,
          statusExpiresAt: null,
        }));
      }
      setEmoji("");
      setText("");
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const hasStatus = Boolean(currentEmoji || currentText);

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent data-testid="set-status-dialog" className="max-w-md">
        <DialogTitle>Set a status</DialogTitle>

        <div className="flex flex-col gap-4 mt-2">
          <div className="flex gap-2">
            <Input
              data-testid="status-emoji-input"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              placeholder="\u{1F600}"
              className="w-16 text-center text-lg"
              maxLength={8}
            />
            <Input
              data-testid="status-text-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What's your status?"
              className="flex-1"
              maxLength={100}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {STATUS_PRESETS.map((preset) => (
              <button
                key={preset.text}
                type="button"
                data-testid={`status-preset-${preset.text.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => handlePreset(preset)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-md border border-border-default bg-surface hover:bg-surface-secondary cursor-pointer text-primary"
              >
                <span>{preset.emoji}</span>
                <span>{preset.text}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">Clear after:</span>
            <Select value={duration} onValueChange={(v) => setDuration(v as DurationOption)}>
              <SelectTrigger data-testid="status-duration-select" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {DURATION_LABELS[opt]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end">
            {hasStatus && (
              <Button
                data-testid="clear-status-button"
                variant="ghost"
                onClick={handleClear}
                disabled={saving}
              >
                Clear Status
              </Button>
            )}
            <Button
              data-testid="save-status-button"
              variant="primary"
              onClick={handleSave}
              disabled={saving || (!emoji && !text)}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
