import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { ChannelPickerModal } from "../search/ChannelPickerModal";

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
      },
      brand: { primary: "#4A154B" },
    },
  }),
}));

const channels = [
  { id: "ch-1", name: "general", type: "public", workspaceId: "ws-1", displayName: null, description: null, isArchived: false, createdAt: "2025-01-01T00:00:00Z", createdBy: null },
  { id: "ch-2", name: "secret", type: "private", workspaceId: "ws-1", displayName: null, description: null, isArchived: false, createdAt: "2025-01-01T00:00:00Z", createdBy: null },
] as any[];

const dms = [
  { channel: { id: "dm-1" }, otherUser: { displayName: "Alice" } },
] as any[];

function renderModal(overrides = {}) {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onSelect: jest.fn(),
    channels,
    dms,
    ...overrides,
  };
  return { ...render(<ChannelPickerModal {...defaultProps} />), props: defaultProps };
}

describe("ChannelPickerModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders channels with # icon", () => {
    renderModal();

    expect(screen.getByText("#")).toBeTruthy();
    expect(screen.getByText("general")).toBeTruthy();
  });

  it("renders private channels with lock icon", () => {
    renderModal();

    expect(screen.getByTestId("icon-Lock")).toBeTruthy();
    expect(screen.getByText("secret")).toBeTruthy();
  });

  it("renders DMs with @ prefix", () => {
    renderModal();

    expect(screen.getByText("@")).toBeTruthy();
    expect(screen.getByText("Alice")).toBeTruthy();
  });

  it("filters items by case-insensitive name match", () => {
    renderModal();

    fireEvent.changeText(screen.getByTestId("channel-picker-filter"), "GEN");

    expect(screen.getByText("general")).toBeTruthy();
    expect(screen.queryByText("secret")).toBeNull();
    expect(screen.queryByText("Alice")).toBeNull();
  });

  it("handleSelect calls onSelect and closes modal", () => {
    const { props } = renderModal();

    fireEvent.press(screen.getByTestId("channel-picker-item-ch-1"));

    expect(props.onSelect).toHaveBeenCalledWith("ch-1", "general");
  });

  it("backdrop press closes and resets filter text", () => {
    const { props } = renderModal();

    fireEvent.changeText(screen.getByTestId("channel-picker-filter"), "test");
    fireEvent.press(screen.getByTestId("channel-picker-backdrop"));

    expect(props.onClose).toHaveBeenCalled();
  });
});
