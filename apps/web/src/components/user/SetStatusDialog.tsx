import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
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
      <DialogContent data-testid="set-status-dialog" className="max-w-sm p-0">
        <div className="px-4 pt-4 pb-3">
          <DialogTitle className="text-base">Set a status</DialogTitle>
        </div>

        {/* Combined emoji + text input (Slack-style) */}
        <div className="px-4 pb-3">
          <div className="flex items-center border border-border-default rounded-md overflow-hidden bg-surface focus-within:border-accent">
            <button
              type="button"
              className="px-3 py-2 text-lg hover:bg-surface-secondary cursor-pointer border-r border-border-default shrink-0"
              onClick={() => {/* emoji picker placeholder */}}
            >
              {emoji || "😀"}
            </button>
            <input
              data-testid="status-emoji-input"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="sr-only"
              maxLength={8}
            />
            <input
              data-testid="status-text-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What's your status?"
              className="flex-1 px-3 py-2 text-sm bg-transparent outline-none text-primary placeholder:text-muted"
              maxLength={100}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border-default" />

        {/* Presets as vertical list */}
        <div className="py-1">
          {STATUS_PRESETS.map((preset) => {
            const isSelected = emoji === preset.emoji && text === preset.text;
            return (
              <button
                key={preset.text}
                type="button"
                data-testid={`status-preset-${preset.text.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => handlePreset(preset)}
                className={`flex items-center gap-3 w-full px-4 py-2 text-left cursor-pointer hover:bg-surface-secondary transition-colors ${
                  isSelected ? "bg-surface-secondary" : ""
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  isSelected ? "border-accent" : "border-border-default"
                }`}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-accent" />}
                </div>
                <span className="text-base shrink-0">{preset.emoji}</span>
                <span className="text-sm text-primary flex-1">{preset.text}</span>
                <span className="text-xs text-muted">{DURATION_LABELS[preset.duration]}</span>
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="border-t border-border-default" />

        {/* Duration as inline text toggles */}
        <div className="px-4 py-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted">Clear after:</span>
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setDuration(opt)}
              className={`text-xs cursor-pointer transition-colors ${
                duration === opt
                  ? "text-accent font-medium underline underline-offset-2"
                  : "text-muted hover:text-primary"
              }`}
            >
              {DURATION_LABELS[opt]}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-border-default" />

        {/* Actions */}
        <div className="flex gap-2 justify-end px-4 py-3">
          {hasStatus && (
            <Button
              data-testid="clear-status-button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={saving}
            >
              Clear Status
            </Button>
          )}
          <Button
            data-testid="save-status-button"
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving || (!emoji && !text)}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
