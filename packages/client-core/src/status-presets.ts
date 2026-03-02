export interface StatusPreset {
  emoji: string;
  text: string;
  duration: DurationOption;
}

export type DurationOption =
  | "dont_clear"
  | "30_min"
  | "1_hour"
  | "4_hours"
  | "today"
  | "this_week";

export const DURATION_LABELS: Record<DurationOption, string> = {
  dont_clear: "Don't clear",
  "30_min": "30 minutes",
  "1_hour": "1 hour",
  "4_hours": "4 hours",
  today: "Today",
  this_week: "This week",
};

export const DURATION_OPTIONS: DurationOption[] = [
  "dont_clear",
  "30_min",
  "1_hour",
  "4_hours",
  "today",
  "this_week",
];

export const STATUS_PRESETS: StatusPreset[] = [
  { emoji: "\u{1F4C5}", text: "In a meeting", duration: "1_hour" },
  { emoji: "\u{1F68C}", text: "Commuting", duration: "30_min" },
  { emoji: "\u{1F912}", text: "Out sick", duration: "today" },
  { emoji: "\u{1F334}", text: "Vacationing", duration: "dont_clear" },
  { emoji: "\u{1F3E0}", text: "Working remotely", duration: "today" },
];

export function durationToExpiresAt(duration: DurationOption): string | null {
  const now = new Date();
  switch (duration) {
    case "dont_clear":
      return null;
    case "30_min":
      return new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    case "1_hour":
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    case "4_hours":
      return new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString();
    case "today": {
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      return endOfDay.toISOString();
    }
    case "this_week": {
      const endOfWeek = new Date(now);
      const daysUntilSunday = 7 - endOfWeek.getDay();
      endOfWeek.setDate(endOfWeek.getDate() + daysUntilSunday);
      endOfWeek.setHours(23, 59, 59, 999);
      return endOfWeek.toISOString();
    }
  }
}
