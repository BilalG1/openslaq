import { formatTime, formatRelativeTime } from "../time";

describe("formatTime", () => {
  it("formats an ISO string as locale time", () => {
    const result = formatTime("2026-03-17T15:45:00Z");
    // Result is locale-dependent, but should contain hour and minute
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe("formatRelativeTime", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-17T12:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns "now" for less than 1 minute ago', () => {
    expect(formatRelativeTime("2026-03-17T11:59:30Z")).toBe("now");
  });

  it("returns minutes for less than 1 hour ago", () => {
    expect(formatRelativeTime("2026-03-17T11:55:00Z")).toBe("5m");
    expect(formatRelativeTime("2026-03-17T11:01:00Z")).toBe("59m");
  });

  it("returns hours for less than 24 hours ago", () => {
    expect(formatRelativeTime("2026-03-17T09:00:00Z")).toBe("3h");
    expect(formatRelativeTime("2026-03-16T13:00:00Z")).toBe("23h");
  });

  it("returns days for less than 30 days ago", () => {
    expect(formatRelativeTime("2026-03-15T12:00:00Z")).toBe("2d");
    expect(formatRelativeTime("2026-02-16T12:00:00Z")).toBe("29d");
  });

  it("returns locale date string for 30+ days ago", () => {
    const result = formatRelativeTime("2026-01-01T12:00:00Z");
    // Should be a date string, not a relative time
    expect(result).not.toMatch(/^\d+[mhd]$/);
    expect(result).not.toBe("now");
  });
});
