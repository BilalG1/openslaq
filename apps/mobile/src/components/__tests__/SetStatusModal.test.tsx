import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { SetStatusModal } from "../SetStatusModal";
import * as clientCore from "@openslaq/client-core";

jest.mock("@openslaq/client-core", () => ({
  STATUS_PRESETS: [
    { emoji: "\u{1F4C5}", text: "In a meeting", duration: "1_hour" },
    { emoji: "\u{1F68C}", text: "Commuting", duration: "30_min" },
  ],
  DURATION_OPTIONS: ["dont_clear", "30_min", "1_hour"],
  DURATION_LABELS: {
    dont_clear: "Don't clear",
    "30_min": "30 minutes",
    "1_hour": "1 hour",
  },
  durationToExpiresAt: jest.fn(() => null),
  setUserStatus: jest.fn(),
  clearUserStatus: jest.fn(),
  handleUserStatusUpdated: jest.fn((payload) => ({
    type: "presence/userStatusUpdated",
    payload,
  })),
}));

jest.mock("../EmojiPickerSheet", () => ({
  EmojiPickerSheet: () => null,
}));

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      brand: { primary: "#1264a3" },
      colors: {
        surface: "#fff",
        surfaceSecondary: "#f5f5f5",
        textPrimary: "#000",
        textMuted: "#666",
        textFaint: "#999",
        borderDefault: "#ddd",
      },
    },
  }),
}));

const mockSetUserStatus = clientCore.setUserStatus as jest.MockedFunction<
  typeof clientCore.setUserStatus
>;
const mockClearUserStatus = clientCore.clearUserStatus as jest.MockedFunction<
  typeof clientCore.clearUserStatus
>;

const mockDeps = {
  api: {} as any,
  auth: { onAuthRequired: jest.fn() } as any,
};
const mockDispatch = jest.fn();

function renderModal(overrides: Record<string, unknown> = {}) {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    currentEmoji: null as string | null,
    currentText: null as string | null,
    userId: "user-1",
    deps: mockDeps,
    dispatch: mockDispatch,
    ...overrides,
  };
  return { ...render(<SetStatusModal {...defaultProps} />), props: defaultProps };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSetUserStatus.mockResolvedValue({
    statusEmoji: "📅",
    statusText: "In a meeting",
    statusExpiresAt: null,
  } as any);
  mockClearUserStatus.mockResolvedValue(undefined as any);
});

describe("SetStatusModal", () => {
  it("renders nothing when not visible", () => {
    renderModal({ visible: false });
    expect(screen.queryByTestId("set-status-modal")).toBeNull();
  });

  it("shows inputs and save button when visible", () => {
    renderModal();
    expect(screen.getByTestId("set-status-modal")).toBeTruthy();
    expect(screen.getByTestId("status-text-input")).toBeTruthy();
    expect(screen.getByTestId("save-status-button")).toBeTruthy();
  });

  it("preset populates emoji, text, and duration", () => {
    renderModal();
    fireEvent.press(screen.getByTestId("status-preset-in-a-meeting"));

    expect(screen.getByTestId("status-text-input").props.value).toBe("In a meeting");
  });

  it("save calls setUserStatus with correct args", async () => {
    renderModal();

    fireEvent.press(screen.getByTestId("status-preset-in-a-meeting"));

    await act(async () => {
      fireEvent.press(screen.getByTestId("save-status-button"));
    });

    expect(mockSetUserStatus).toHaveBeenCalledWith(mockDeps, {
      emoji: "📅",
      text: "In a meeting",
      expiresAt: null,
    });
    expect(mockDispatch).toHaveBeenCalled();
  });

  it("clear calls clearUserStatus", async () => {
    const { props } = renderModal({
      currentEmoji: "📅",
      currentText: "In a meeting",
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("clear-status-button"));
    });

    expect(mockClearUserStatus).toHaveBeenCalledWith(mockDeps);
    expect(mockDispatch).toHaveBeenCalled();
    expect(props.onClose).toHaveBeenCalled();
  });

  it("clear button only shown when current status exists", () => {
    renderModal({ currentEmoji: null, currentText: null });
    expect(screen.queryByTestId("clear-status-button")).toBeNull();
  });

  it("shows clear button when current status exists", () => {
    renderModal({ currentEmoji: "📅", currentText: "Busy" });
    expect(screen.getByTestId("clear-status-button")).toBeTruthy();
  });

  it("calls onClose on backdrop tap", () => {
    const { props } = renderModal();
    fireEvent.press(screen.getByTestId("set-status-modal-backdrop"));
    expect(props.onClose).toHaveBeenCalled();
  });

  it("shows duration chips", () => {
    renderModal();
    expect(screen.getByTestId("status-duration-dont_clear")).toBeTruthy();
    expect(screen.getByTestId("status-duration-30_min")).toBeTruthy();
    expect(screen.getByTestId("status-duration-1_hour")).toBeTruthy();
  });
});
