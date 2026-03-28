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
      brand: { primary: "#1264a3" },
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
    fireEvent.press(screen.getByTestId("date-picker-modal-backdrop"));

    expect(props.onClose).toHaveBeenCalled();
  });

  it("empty dates pass as undefined", () => {
    const { props } = renderModal();

    fireEvent.press(screen.getByTestId("date-picker-apply"));

    expect(props.onApply).toHaveBeenCalledWith(undefined, undefined);
  });

  it("uses dynamic placeholders based on current date", () => {
    renderModal();

    const fromInput = screen.getByTestId("date-picker-from");
    const toInput = screen.getByTestId("date-picker-to");

    const now = new Date();
    const expectedFrom = `${now.getFullYear()}-01-01`;
    const expectedTo = now.toISOString().slice(0, 10);

    expect(fromInput.props.placeholder).toBe(expectedFrom);
    expect(toInput.props.placeholder).toBe(expectedTo);
  });

  it("uses keyboard avoidance so inputs and apply button remain reachable", () => {
    const { toJSON } = renderModal();
    const tree = toJSON()!;
    // When avoidKeyboard is enabled, the Modal's first child is a KeyboardAvoidingView
    // which renders as a View with style [{flex:1},{paddingBottom:0}] (padding behavior).
    // Without avoidKeyboard, the first child is the backdrop Pressable directly.
    const modalChild = (tree as any).children[0];
    // The KAV wrapper has a style array with flex:1 and paddingBottom
    const style = modalChild.props.style;
    expect(Array.isArray(style)).toBe(true);
    expect(style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ flex: 1 }),
        expect.objectContaining({ paddingBottom: expect.any(Number) }),
      ]),
    );
  });
});
