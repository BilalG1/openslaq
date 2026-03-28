import React from "react";
import { Alert } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { HuddleHeaderButton } from "../huddle/HuddleHeaderButton";
import { asChannelId } from "@openslaq/shared";

const mockJoinHuddle = jest.fn();
const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => ({ workspaceSlug: "acme" }),
}));

jest.mock("@/contexts/HuddleProvider", () => ({
  useHuddle: () => ({
    joinHuddle: mockJoinHuddle,
  }),
}));

jest.mock("@/lib/routes", () => ({
  routes: {
    huddle: (ws: string) => `/(app)/${ws}/huddle`,
  },
}));

let mockHuddleForChannel = {
  activeHuddle: null as null | { participants: Array<{ userId: string }> },
  isUserInHuddle: false,
};

jest.mock("@/hooks/useHuddleForChannel", () => ({
  useHuddleForChannel: () => mockHuddleForChannel,
}));

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      brand: { primary: "#1264a3" },
      colors: { textPrimary: "#000" },
    },
  }),
}));

describe("HuddleHeaderButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHuddleForChannel = {
      activeHuddle: null,
      isUserInHuddle: false,
    };
  });

  it("renders start button when no active huddle", () => {
    render(<HuddleHeaderButton channelId={asChannelId("ch-1")} />);
    expect(screen.getByTestId("huddle-start-button")).toBeTruthy();
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

  it("calls joinHuddle and navigates to huddle page when confirmed", () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    render(<HuddleHeaderButton channelId={asChannelId("ch-1")} />);
    fireEvent.press(screen.getByTestId("huddle-start-button"));
    const buttons = alertSpy.mock.calls[0]![2] as Array<{ text: string; onPress?: () => void }>;
    buttons.find((b) => b.text === "Start")?.onPress?.();
    expect(mockJoinHuddle).toHaveBeenCalledWith("ch-1");
    expect(mockPush).toHaveBeenCalledWith("/(app)/acme/huddle");
    alertSpy.mockRestore();
  });

  it("shows participant count and green background when huddle is active", () => {
    mockHuddleForChannel = {
      activeHuddle: { participants: [{ userId: "other-user" }] },
      isUserInHuddle: false,
    };
    render(<HuddleHeaderButton channelId={asChannelId("ch-1")} />);
    expect(screen.getByTestId("huddle-join-button")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
  });

  it("joins and navigates directly when active huddle exists", () => {
    mockHuddleForChannel = {
      activeHuddle: { participants: [{ userId: "other-user" }] },
      isUserInHuddle: false,
    };
    const alertSpy = jest.spyOn(Alert, "alert");
    render(<HuddleHeaderButton channelId={asChannelId("ch-1")} />);
    fireEvent.press(screen.getByTestId("huddle-join-button"));
    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockJoinHuddle).toHaveBeenCalledWith("ch-1");
    expect(mockPush).toHaveBeenCalledWith("/(app)/acme/huddle");
    alertSpy.mockRestore();
  });

  it("does not trigger join when user is already in huddle", () => {
    mockHuddleForChannel = {
      activeHuddle: { participants: [{ userId: "me" }] },
      isUserInHuddle: true,
    };
    render(<HuddleHeaderButton channelId={asChannelId("ch-1")} />);
    fireEvent.press(screen.getByTestId("huddle-in-progress"));
    expect(mockJoinHuddle).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
