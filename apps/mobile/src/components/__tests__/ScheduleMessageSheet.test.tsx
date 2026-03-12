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

    fireEvent.press(getByTestId("schedule-sheet-backdrop"));
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
});
