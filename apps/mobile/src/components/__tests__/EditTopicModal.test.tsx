import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { EditTopicModal } from "../EditTopicModal";

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#fff",
        surfaceSecondary: "#f0f0f0",
        surfaceTertiary: "#e0e0e0",
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

function renderModal(overrides: Partial<React.ComponentProps<typeof EditTopicModal>> = {}) {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    currentDescription: "Current topic",
    onSave: jest.fn(() => Promise.resolve()),
    ...overrides,
  };
  return { ...render(<EditTopicModal {...defaultProps} />), props: defaultProps };
}

describe("EditTopicModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with currentDescription as initial draft text", () => {
    renderModal({ currentDescription: "Hello world" });

    expect(screen.getByTestId("edit-topic-input").props.value).toBe("Hello world");
  });

  it("save calls onSave with trimmed text and onClose", async () => {
    const { props } = renderModal({ currentDescription: "  trimmed  " });

    await act(async () => {
      fireEvent.press(screen.getByTestId("edit-topic-save"));
    });

    expect(props.onSave).toHaveBeenCalledWith("trimmed");
    expect(props.onClose).toHaveBeenCalled();
  });

  it("save with empty draft calls onSave(null)", async () => {
    const { props } = renderModal({ currentDescription: "" });

    fireEvent.changeText(screen.getByTestId("edit-topic-input"), "");

    await act(async () => {
      fireEvent.press(screen.getByTestId("edit-topic-save"));
    });

    expect(props.onSave).toHaveBeenCalledWith(null);
  });

  it("clear button calls onSave(null) and onClose", async () => {
    const { props } = renderModal({ currentDescription: "Some topic" });

    await act(async () => {
      fireEvent.press(screen.getByTestId("edit-topic-clear"));
    });

    expect(props.onSave).toHaveBeenCalledWith(null);
    expect(props.onClose).toHaveBeenCalled();
  });

  it("clear button hidden when currentDescription is null", () => {
    renderModal({ currentDescription: null });

    expect(screen.queryByTestId("edit-topic-clear")).toBeNull();
  });

  it("clear button hidden when currentDescription is undefined", () => {
    renderModal({ currentDescription: undefined });

    expect(screen.queryByTestId("edit-topic-clear")).toBeNull();
  });

  it("save button disabled during saving", async () => {
    let resolveSave!: () => void;
    const onSave = jest.fn(() => new Promise<void>((r) => { resolveSave = r; }));

    renderModal({ onSave });

    await act(async () => {
      fireEvent.press(screen.getByTestId("edit-topic-save"));
    });

    // Save button should be disabled (saving state)
    expect(screen.getByTestId("edit-topic-save").props.accessibilityState?.disabled ?? screen.getByTestId("edit-topic-save").props.disabled).toBeTruthy();

    await act(async () => { resolveSave(); });
  });

  it("backdrop press calls onClose", () => {
    const { props } = renderModal();

    fireEvent.press(screen.getByTestId("edit-topic-backdrop"));

    expect(props.onClose).toHaveBeenCalled();
  });
});
