import { describe, expect, test, afterEach } from "vitest";
import { render, screen, cleanup } from "../../test-utils";
import { DaySeparator } from "./DaySeparator";

describe("DaySeparator", () => {
  afterEach(cleanup);

  test("renders 'Today' for today's date", () => {
    render(<DaySeparator date={new Date()} />);
    expect(screen.getByTestId("day-separator").textContent).toBe("Today");
  });

  test("renders 'Yesterday' for yesterday's date", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    render(<DaySeparator date={yesterday} />);
    expect(screen.getByTestId("day-separator").textContent).toBe("Yesterday");
  });

  test("renders formatted date for older dates", () => {
    const oldDate = new Date(2025, 0, 15); // January 15, 2025 (Wednesday)
    render(<DaySeparator date={oldDate} />);
    const text = screen.getByTestId("day-separator").textContent!;
    expect(text).toContain("January");
    expect(text).toContain("15");
    expect(text).toContain("Wednesday");
  });

  test("sets correct data-date attribute", () => {
    const date = new Date(2025, 5, 3); // June 3, 2025
    render(<DaySeparator date={date} />);
    expect(screen.getByTestId("day-separator").getAttribute("data-date")).toBe("2025-06-03");
  });

  test("zero-pads month and day in data-date", () => {
    const date = new Date(2025, 0, 5); // January 5
    render(<DaySeparator date={date} />);
    expect(screen.getByTestId("day-separator").getAttribute("data-date")).toBe("2025-01-05");
  });
});
