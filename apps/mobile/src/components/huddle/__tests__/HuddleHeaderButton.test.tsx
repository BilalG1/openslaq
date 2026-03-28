import React from "react";
import { Alert } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { asChannelId } from "@openslaq/shared";

const mockJoinHuddle = jest.fn();
const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => ({ workspaceSlug: "acme" }),
}));

jest.mock("@/contexts/HuddleProvider", () => ({
  useHuddle: () => ({ joinHuddle: mockJoinHuddle }),
}));

jest.mock("@/lib/routes", () => ({
  routes: { huddle: (ws: string) => `/(app)/${ws}/huddle` },
}));

let mockHuddleForChannel: { activeHuddle: unknown; isUserInHuddle: boolean } = {
  activeHuddle: null,
  isUserInHuddle: false,
};

jest.mock("@/hooks/useHuddleForChannel", () => ({
  useHuddleForChannel: () => mockHuddleForChannel,
}));

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: { brand: { primary: "#1264a3" } },
  }),
}));

jest.mock("@/theme/constants", () => ({ GREEN: "#30a14e", WHITE: "#fff" }));

jest.mock("lucide-react-native", () => ({
  Headphones: (props: Record<string, unknown>) => {
    const { View } = require("react-native");
    return <View testID="headphones-icon" {...props} />;
  },
}));

import { HuddleHeaderButton } from "../HuddleHeaderButton";

describe("HuddleHeaderButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHuddleForChannel = { activeHuddle: null, isUserInHuddle: false };
  });

  it("renders start button when no active huddle", () => {
    render(<HuddleHeaderButton channelId={asChannelId("ch-1")} />);
    expect(screen.getByTestId("huddle-start-button")).toBeTruthy();
    expect(screen.getByTestId("headphones-icon")).toBeTruthy();
  });

  it("shows confirmation dialog when starting a huddle", () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    render(<HuddleHeaderButton channelId={asChannelId("ch-1")} />);
    fireEvent.press(screen.getByTestId("huddle-start-button"));
    expect(alertSpy).toHaveBeenCalledWith(
      "Start a huddle?",
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ text: "Cancel" }),
        expect.objectContaining({ text: "Start" }),
      ]),
    );
    expect(mockJoinHuddle).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("navigates to huddle page after confirming start", () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    render(<HuddleHeaderButton channelId={asChannelId("ch-1")} />);
    fireEvent.press(screen.getByTestId("huddle-start-button"));
    const buttons = alertSpy.mock.calls[0]![2] as Array<{ text: string; onPress?: () => void }>;
    buttons.find((b) => b.text === "Start")?.onPress?.();
    expect(mockJoinHuddle).toHaveBeenCalledWith(asChannelId("ch-1"));
    expect(mockPush).toHaveBeenCalledWith("/(app)/acme/huddle");
    alertSpy.mockRestore();
  });

  it("shows green background and participant count when huddle is active", () => {
    mockHuddleForChannel = {
      activeHuddle: { participants: [{ userId: "u-2" }, { userId: "u-3" }] },
      isUserInHuddle: false,
    };
    render(<HuddleHeaderButton channelId={asChannelId("ch-1")} />);
    expect(screen.getByTestId("huddle-join-button")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("joins and navigates directly when active huddle exists", () => {
    mockHuddleForChannel = {
      activeHuddle: { participants: [{ userId: "u-2" }] },
      isUserInHuddle: false,
    };
    const alertSpy = jest.spyOn(Alert, "alert");
    render(<HuddleHeaderButton channelId={asChannelId("ch-1")} />);
    fireEvent.press(screen.getByTestId("huddle-join-button"));
    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockJoinHuddle).toHaveBeenCalledWith(asChannelId("ch-1"));
    expect(mockPush).toHaveBeenCalledWith("/(app)/acme/huddle");
    alertSpy.mockRestore();
  });

  it("does not call joinHuddle when user is already in huddle", () => {
    mockHuddleForChannel = {
      activeHuddle: { participants: [{ userId: "u-1" }] },
      isUserInHuddle: true,
    };
    render(<HuddleHeaderButton channelId={asChannelId("ch-1")} />);
    fireEvent.press(screen.getByTestId("huddle-in-progress"));
    expect(mockJoinHuddle).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("keeps headphones icon in all states", () => {
    const { unmount } = render(<HuddleHeaderButton channelId={asChannelId("ch-1")} />);
    expect(screen.getByTestId("headphones-icon")).toBeTruthy();
    unmount();

    mockHuddleForChannel = {
      activeHuddle: { participants: [{ userId: "u-2" }] },
      isUserInHuddle: false,
    };
    const { unmount: unmount2 } = render(<HuddleHeaderButton channelId={asChannelId("ch-1")} />);
    expect(screen.getByTestId("headphones-icon")).toBeTruthy();
    unmount2();

    mockHuddleForChannel = {
      activeHuddle: { participants: [{ userId: "u-1" }] },
      isUserInHuddle: true,
    };
    render(<HuddleHeaderButton channelId={asChannelId("ch-1")} />);
    expect(screen.getByTestId("headphones-icon")).toBeTruthy();
  });
});
