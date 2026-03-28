import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ScheduleMessageSheet } from "../ScheduleMessageSheet";

describe("ScheduleMessageSheet", () => {
  const defaultProps = {
    visible: true,
    onSchedule: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all 5 preset options", () => {
    const { getByTestId } = render(<ScheduleMessageSheet {...defaultProps} />);

    expect(getByTestId("schedule-preset-in-20-minutes")).toBeTruthy();
    expect(getByTestId("schedule-preset-in-1-hour")).toBeTruthy();
    expect(getByTestId("schedule-preset-in-3-hours")).toBeTruthy();
    expect(getByTestId("schedule-preset-tomorrow-at-9:00-am")).toBeTruthy();
    expect(getByTestId("schedule-preset-next-monday-at-9:00-am")).toBeTruthy();
  });

  it("calls onSchedule with a future Date when a preset is tapped", () => {
    const onSchedule = jest.fn();
    const { getByTestId } = render(
      <ScheduleMessageSheet {...defaultProps} onSchedule={onSchedule} />,
    );

    fireEvent.press(getByTestId("schedule-preset-in-20-minutes"));

    expect(onSchedule).toHaveBeenCalledTimes(1);
    const scheduledDate = onSchedule.mock.calls[0][0] as Date;
    expect(scheduledDate.getTime()).toBeGreaterThan(Date.now());
  });

  it("calls onSchedule with correct future time for 1 hour preset", () => {
    const onSchedule = jest.fn();
    const { getByTestId } = render(
      <ScheduleMessageSheet {...defaultProps} onSchedule={onSchedule} />,
    );

    fireEvent.press(getByTestId("schedule-preset-in-1-hour"));

    expect(onSchedule).toHaveBeenCalledTimes(1);
    const scheduledDate = onSchedule.mock.calls[0][0] as Date;
    // Should be roughly 1 hour from now (within 10 min tolerance for rounding)
    const diffMs = scheduledDate.getTime() - Date.now();
    expect(diffMs).toBeGreaterThan(50 * 60_000);
    expect(diffMs).toBeLessThan(70 * 60_000);
  });

  it("calls onClose when backdrop is pressed", () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <ScheduleMessageSheet {...defaultProps} onClose={onClose} />,
    );

    fireEvent.press(getByTestId("schedule-sheet-content-backdrop"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows custom time inputs when Custom time is tapped", () => {
    const { getByTestId, queryByTestId } = render(
      <ScheduleMessageSheet {...defaultProps} />,
    );

    expect(queryByTestId("schedule-custom-section")).toBeNull();
    fireEvent.press(getByTestId("schedule-custom-toggle"));
    expect(getByTestId("schedule-custom-section")).toBeTruthy();
    expect(getByTestId("schedule-custom-date")).toBeTruthy();
    expect(getByTestId("schedule-custom-time")).toBeTruthy();
    expect(getByTestId("schedule-custom-submit")).toBeTruthy();
  });

  it("submits custom time with valid future date", () => {
    const onSchedule = jest.fn();
    const { getByTestId } = render(
      <ScheduleMessageSheet {...defaultProps} onSchedule={onSchedule} />,
    );

    fireEvent.press(getByTestId("schedule-custom-toggle"));

    const futureDate = new Date(Date.now() + 24 * 60 * 60_000);
    const dateStr = futureDate.toISOString().split("T")[0];

    fireEvent.changeText(getByTestId("schedule-custom-date"), dateStr);
    fireEvent.changeText(getByTestId("schedule-custom-time"), "14:00");
    fireEvent.press(getByTestId("schedule-custom-submit"));

    expect(onSchedule).toHaveBeenCalledTimes(1);
  });

  it("does not submit custom time when date is missing", () => {
    const onSchedule = jest.fn();
    const { getByTestId } = render(
      <ScheduleMessageSheet {...defaultProps} onSchedule={onSchedule} />,
    );

    fireEvent.press(getByTestId("schedule-custom-toggle"));
    fireEvent.press(getByTestId("schedule-custom-submit"));

    expect(onSchedule).not.toHaveBeenCalled();
  });

  it("is not visible when visible is false", () => {
    const { queryByTestId } = render(
      <ScheduleMessageSheet {...defaultProps} visible={false} />,
    );

    expect(queryByTestId("schedule-sheet-content")).toBeNull();
  });

  it("computes preset time relative to tap time, not render time", () => {
    const onSchedule = jest.fn();
    // Render the sheet at T=0
    const { getByTestId } = render(
      <ScheduleMessageSheet {...defaultProps} onSchedule={onSchedule} />,
    );

    // Advance clock by 10 minutes to simulate the user waiting before tapping
    const tenMinutesMs = 10 * 60_000;
    jest.useFakeTimers();
    jest.setSystemTime(Date.now() + tenMinutesMs);

    fireEvent.press(getByTestId("schedule-preset-in-20-minutes"));

    const scheduledDate = onSchedule.mock.calls[0][0] as Date;
    // The scheduled time should be ~20 min from NOW (after the 10 min wait),
    // not ~20 min from when the sheet was rendered (which would be ~10 min from now)
    const diffFromNow = scheduledDate.getTime() - Date.now();
    // Should be ~20 minutes from now (with 5 min rounding tolerance), NOT ~10 min
    expect(diffFromNow).toBeGreaterThan(15 * 60_000);

    jest.useRealTimers();
  });

  it("does not submit when custom date string is invalid", () => {
    // BUG: new Date("abcT09:00") creates Invalid Date, but NaN <= number is false,
    // so the guard passes and onSchedule is called with Invalid Date
    const onSchedule = jest.fn();
    const { getByTestId } = render(
      <ScheduleMessageSheet {...defaultProps} onSchedule={onSchedule} />,
    );

    fireEvent.press(getByTestId("schedule-custom-toggle"));
    fireEvent.changeText(getByTestId("schedule-custom-date"), "not-a-date");
    fireEvent.changeText(getByTestId("schedule-custom-time"), "09:00");
    fireEvent.press(getByTestId("schedule-custom-submit"));

    expect(onSchedule).not.toHaveBeenCalled();
  });
});
