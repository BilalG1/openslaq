/**
 * Parses natural language time expressions into a Date.
 * Supported formats:
 *   - "in N minutes/hours/days"
 *   - "tomorrow [at HH:MM]"
 *   - "at HH:MM"
 *   - "next monday/tuesday/..."
 */
export function parseRemindTime(input: string): Date | null {
  const trimmed = input.trim().toLowerCase();

  // "in N minutes/hours/days"
  const inMatch = trimmed.match(/^in\s+(\d+)\s+(minute|minutes|min|mins|hour|hours|hr|hrs|day|days)$/);
  if (inMatch) {
    const n = parseInt(inMatch[1]!, 10);
    const unit = inMatch[2]!;
    const now = new Date();
    if (unit.startsWith("min")) {
      now.setMinutes(now.getMinutes() + n);
    } else if (unit.startsWith("hour") || unit.startsWith("hr")) {
      now.setHours(now.getHours() + n);
    } else if (unit.startsWith("day")) {
      now.setDate(now.getDate() + n);
    }
    return now;
  }

  // "tomorrow at HH:MM"
  const tomorrowAtMatch = trimmed.match(/^tomorrow\s+at\s+(\d{1,2}):(\d{2})$/);
  if (tomorrowAtMatch) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(parseInt(tomorrowAtMatch[1]!, 10), parseInt(tomorrowAtMatch[2]!, 10), 0, 0);
    return d;
  }

  // "tomorrow"
  if (trimmed === "tomorrow") {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0); // default to 9am
    return d;
  }

  // "at HH:MM"
  const atMatch = trimmed.match(/^at\s+(\d{1,2}):(\d{2})$/);
  if (atMatch) {
    const d = new Date();
    const hours = parseInt(atMatch[1]!, 10);
    const minutes = parseInt(atMatch[2]!, 10);
    d.setHours(hours, minutes, 0, 0);
    // If the time is in the past today, set it for tomorrow
    if (d.getTime() <= Date.now()) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  }

  // "next monday/tuesday/..."
  const dayNames: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };
  const nextDayMatch = trimmed.match(/^next\s+(\w+)$/);
  if (nextDayMatch) {
    const targetDay = dayNames[nextDayMatch[1]!];
    if (targetDay !== undefined) {
      const d = new Date();
      const currentDay = d.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      d.setDate(d.getDate() + daysUntil);
      d.setHours(9, 0, 0, 0); // default to 9am
      return d;
    }
  }

  return null;
}
