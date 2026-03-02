import { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "../ui/dialog";

interface ScheduleMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (scheduledFor: Date) => void;
}

function roundToNext5Min(date: Date): Date {
  const ms = date.getTime();
  const fiveMin = 5 * 60 * 1000;
  return new Date(Math.ceil(ms / fiveMin) * fiveMin);
}

function formatPresetTime(date: Date): string {
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ScheduleMessageDialog({ open, onOpenChange, onSchedule }: ScheduleMessageDialogProps) {
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("09:00");

  const presets = useMemo(() => {
    const now = new Date();
    const in20 = roundToNext5Min(new Date(now.getTime() + 20 * 60_000));
    const in1h = roundToNext5Min(new Date(now.getTime() + 60 * 60_000));
    const in3h = roundToNext5Min(new Date(now.getTime() + 3 * 60 * 60_000));

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    const nextMonday = new Date(now);
    const daysUntilMonday = (8 - nextMonday.getDay()) % 7 || 7;
    nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
    nextMonday.setHours(9, 0, 0, 0);

    return [
      { label: "In 20 minutes", time: in20 },
      { label: "In 1 hour", time: in1h },
      { label: "In 3 hours", time: in3h },
      { label: "Tomorrow at 9:00 AM", time: tomorrow },
      { label: "Next Monday at 9:00 AM", time: nextMonday },
    ];
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePreset = useCallback(
    (time: Date) => {
      onSchedule(time);
      onOpenChange(false);
    },
    [onSchedule, onOpenChange],
  );

  const handleCustomSubmit = useCallback(() => {
    if (!customDate || !customTime) return;
    const date = new Date(`${customDate}T${customTime}`);
    if (date.getTime() <= Date.now() + 60_000) return;
    onSchedule(date);
    onOpenChange(false);
  }, [customDate, customTime, onSchedule, onOpenChange]);

  const minDate = new Date().toISOString().split("T")[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" data-testid="schedule-message-dialog">
        <div className="p-4">
          <DialogTitle className="mb-4">Schedule message</DialogTitle>

          <div className="space-y-1 mb-4">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handlePreset(preset.time)}
                className="w-full text-left px-3 py-2 text-sm rounded hover:bg-surface-raised cursor-pointer bg-transparent border-none text-primary"
                data-testid={`schedule-preset-${preset.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <span className="font-medium">{preset.label}</span>
                <span className="text-secondary ml-2">{formatPresetTime(preset.time)}</span>
              </button>
            ))}
          </div>

          <div className="border-t border-border-default pt-4">
            <div className="text-sm font-medium text-primary mb-2">Custom time</div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <input
                  type="date"
                  value={customDate}
                  min={minDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-border-default rounded bg-surface text-primary"
                  data-testid="schedule-custom-date"
                />
              </div>
              <div className="w-24">
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-border-default rounded bg-surface text-primary"
                  data-testid="schedule-custom-time"
                />
              </div>
              <button
                type="button"
                onClick={handleCustomSubmit}
                disabled={!customDate || !customTime}
                className="px-3 py-1.5 text-sm rounded bg-slaq-blue text-white disabled:opacity-50 border-none cursor-pointer"
                data-testid="schedule-custom-submit"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
