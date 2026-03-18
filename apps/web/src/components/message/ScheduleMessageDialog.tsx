import { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

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

type Tab = "quick" | "custom";

export function ScheduleMessageDialog({ open, onOpenChange, onSchedule }: ScheduleMessageDialogProps) {
  const [activeTab, setActiveTab] = useState<Tab>("quick");
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
      { label: "Tomorrow 9 AM", time: tomorrow },
      { label: "Next Monday 9 AM", time: nextMonday },
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

  const minDate = useMemo(() => new Date().toISOString().split("T")[0]!, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" data-testid="schedule-message-dialog">
        <div className="p-4">
          <DialogTitle className="mb-4">Schedule message</DialogTitle>

          <div className="flex border-b border-border-default mb-4">
            <button
              type="button"
              onClick={() => setActiveTab("quick")}
              className={`px-4 py-2 text-sm font-medium cursor-pointer bg-transparent border-none transition-colors ${
                activeTab === "quick"
                  ? "text-slaq-blue border-b-2 border-b-slaq-blue -mb-px"
                  : "text-secondary hover:text-primary"
              }`}
            >
              Quick pick
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("custom")}
              className={`px-4 py-2 text-sm font-medium cursor-pointer bg-transparent border-none transition-colors ${
                activeTab === "custom"
                  ? "text-slaq-blue border-b-2 border-b-slaq-blue -mb-px"
                  : "text-secondary hover:text-primary"
              }`}
            >
              Custom
            </button>
          </div>

          {activeTab === "quick" && (
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePreset(preset.time)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full bg-surface-raised border border-border-default hover:bg-slaq-blue hover:text-white hover:border-slaq-blue transition-colors cursor-pointer text-primary"
                  data-testid={`schedule-preset-${preset.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <span className="font-medium">{preset.label}</span>
                  <span className="text-xs opacity-70">{formatPresetTime(preset.time)}</span>
                </button>
              ))}
            </div>
          )}

          {activeTab === "custom" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">Date</label>
                <Input
                  type="date"
                  value={customDate}
                  min={minDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full"
                  data-testid="schedule-custom-date"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">Time</label>
                <Input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="w-full"
                  data-testid="schedule-custom-time"
                />
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={handleCustomSubmit}
                disabled={!customDate || !customTime}
                className="w-full"
                data-testid="schedule-custom-submit"
              >
                Schedule
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
