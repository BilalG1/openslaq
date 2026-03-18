import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { NotificationLevelSheet } from "../NotificationLevelSheet";

describe("NotificationLevelSheet", () => {
  const defaultProps = {
    visible: true,
    currentLevel: "all" as const,
    onSelect: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all three notification level options", () => {
    const { getByTestId } = render(<NotificationLevelSheet {...defaultProps} />);

    expect(getByTestId("notification-level-all")).toBeTruthy();
    expect(getByTestId("notification-level-mentions")).toBeTruthy();
    expect(getByTestId("notification-level-muted")).toBeTruthy();
  });

  it("shows checkmark on current level", () => {
    const { getByTestId, queryByTestId } = render(
      <NotificationLevelSheet {...defaultProps} currentLevel="mentions" />,
    );

    expect(queryByTestId("notification-check-all")).toBeNull();
    expect(getByTestId("notification-check-mentions")).toBeTruthy();
    expect(queryByTestId("notification-check-muted")).toBeNull();
  });

  it("calls onSelect with correct level when a row is pressed", () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <NotificationLevelSheet {...defaultProps} onSelect={onSelect} />,
    );

    fireEvent.press(getByTestId("notification-level-mentions"));
    expect(onSelect).toHaveBeenCalledWith("mentions");

    fireEvent.press(getByTestId("notification-level-muted"));
    expect(onSelect).toHaveBeenCalledWith("muted");
  });

  it("calls onClose when backdrop is pressed", () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <NotificationLevelSheet {...defaultProps} onClose={onClose} />,
    );

    fireEvent.press(getByTestId("notification-sheet-content-backdrop"));
    expect(onClose).toHaveBeenCalled();
  });

  it("does not call onSelect when pressing the already-selected level", () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <NotificationLevelSheet {...defaultProps} currentLevel="all" onSelect={onSelect} />,
    );

    fireEvent.press(getByTestId("notification-level-all"));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("is not visible when visible is false", () => {
    const { queryByTestId } = render(
      <NotificationLevelSheet {...defaultProps} visible={false} />,
    );

    expect(queryByTestId("notification-sheet-content")).toBeNull();
  });
});
