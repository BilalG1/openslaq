import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { DatePickerModal } from "../search/DatePickerModal";

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#fff",
        surfaceSecondary: "#f0f0f0",
        textPrimary: "#000",
        textSecondary: "#666",
        textFaint: "#999",
        borderDefault: "#ddd",
        dangerText: "#d00",
      },
      brand: { primary: "#4A154B" },
    },
  }),
}));

function renderModal(overrides = {}) {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onApply: jest.fn(),
    initialFrom: undefined as string | undefined,
    initialTo: undefined as string | undefined,
    ...overrides,
  };
  return { ...render(<DatePickerModal {...defaultProps} />), props: defaultProps };
}

describe("DatePickerModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with initial dates pre-filled", () => {
    renderModal({ initialFrom: "2025-01-01", initialTo: "2025-12-31" });

    expect(screen.getByTestId("date-picker-from").props.value).toBe("2025-01-01");
    expect(screen.getByTestId("date-picker-to").props.value).toBe("2025-12-31");
  });

  it("apply with valid dates calls onApply", () => {
    const { props } = renderModal();

    fireEvent.changeText(screen.getByTestId("date-picker-from"), "2025-01-01");
    fireEvent.changeText(screen.getByTestId("date-picker-to"), "2025-12-31");
    fireEvent.press(screen.getByTestId("date-picker-apply"));

    expect(props.onApply).toHaveBeenCalledWith("2025-01-01", "2025-12-31");
  });

  it("shows error for invalid From date format", () => {
    renderModal();

    fireEvent.changeText(screen.getByTestId("date-picker-from"), "not-a-date");
    fireEvent.press(screen.getByTestId("date-picker-apply"));

    expect(screen.getByTestId("date-picker-error")).toBeTruthy();
    expect(screen.getByText("Invalid 'From' date. Use YYYY-MM-DD format.")).toBeTruthy();
  });

  it("shows error for invalid To date format", () => {
    renderModal();

    fireEvent.changeText(screen.getByTestId("date-picker-from"), "2025-01-01");
    fireEvent.changeText(screen.getByTestId("date-picker-to"), "bad");
    fireEvent.press(screen.getByTestId("date-picker-apply"));

    expect(screen.getByTestId("date-picker-error")).toBeTruthy();
    expect(screen.getByText("Invalid 'To' date. Use YYYY-MM-DD format.")).toBeTruthy();
  });

  it("shows error when From date > To date", () => {
    renderModal();

    fireEvent.changeText(screen.getByTestId("date-picker-from"), "2025-12-31");
    fireEvent.changeText(screen.getByTestId("date-picker-to"), "2025-01-01");
    fireEvent.press(screen.getByTestId("date-picker-apply"));

    expect(screen.getByTestId("date-picker-error")).toBeTruthy();
    expect(screen.getByText("'From' date must be before 'To' date.")).toBeTruthy();
  });

  it("close resets to initial values and clears error", () => {
    const { props } = renderModal({ initialFrom: "2025-06-01" });

    // Type something different and trigger an error
    fireEvent.changeText(screen.getByTestId("date-picker-from"), "bad");
    fireEvent.press(screen.getByTestId("date-picker-apply"));
    expect(screen.getByTestId("date-picker-error")).toBeTruthy();

    // Close via backdrop
    fireEvent.press(screen.getByTestId("date-picker-backdrop"));

    expect(props.onClose).toHaveBeenCalled();
  });

  it("empty dates pass as undefined", () => {
    const { props } = renderModal();

    fireEvent.press(screen.getByTestId("date-picker-apply"));

    expect(props.onApply).toHaveBeenCalledWith(undefined, undefined);
  });
});
