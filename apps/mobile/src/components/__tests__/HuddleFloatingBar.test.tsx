import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { HuddleFloatingBar } from "../huddle/HuddleFloatingBar";

const mockLeaveHuddle = jest.fn();
const mockToggleMute = jest.fn();
const mockToggleCamera = jest.fn();

let mockHuddleState = {
  channelId: null as string | null,
  connected: false,
  isMuted: false,
  isCameraOn: false,
  participants: [] as Array<{ userId: string; isMuted: boolean; isCameraOn: boolean }>,
  room: null,
  error: null,
  joinHuddle: jest.fn(),
  leaveHuddle: mockLeaveHuddle,
  toggleMute: mockToggleMute,
  toggleCamera: mockToggleCamera,
};

jest.mock("@/contexts/HuddleProvider", () => ({
  useHuddle: () => mockHuddleState,
}));

jest.mock("@/contexts/ChatStoreProvider", () => ({
  useChatStore: () => ({
    state: {
      channels: [{ id: "ch-1", name: "general" }],
      dms: [],
    },
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useLocalSearchParams: () => ({ workspaceSlug: "default" }),
}));

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#fff",
        surfaceSecondary: "#f0f0f0",
        surfaceTertiary: "#e0e0e0",
        textPrimary: "#000",
        textSecondary: "#666",
      },
      brand: { primary: "#4A154B", danger: "#E01E5A" },
    },
  }),
}));

describe("HuddleFloatingBar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHuddleState = {
      channelId: null,
      connected: false,
      isMuted: false,
      isCameraOn: false,
      participants: [],
      room: null,
      error: null,
      joinHuddle: jest.fn(),
      leaveHuddle: mockLeaveHuddle,
      toggleMute: mockToggleMute,
      toggleCamera: mockToggleCamera,
    };
  });

  it("returns null when not in a huddle", () => {
    const { toJSON } = render(<HuddleFloatingBar />);
    expect(toJSON()).toBeNull();
  });

  it("renders when in a huddle", () => {
    mockHuddleState.channelId = "ch-1";
    mockHuddleState.connected = true;
    mockHuddleState.participants = [{ userId: "u1", isMuted: false, isCameraOn: false }];

    render(<HuddleFloatingBar />);

    expect(screen.getByTestId("huddle-floating-bar")).toBeTruthy();
    expect(screen.getByText("# general")).toBeTruthy();
  });

  it("calls toggleMute when mute button is pressed", () => {
    mockHuddleState.channelId = "ch-1";

    render(<HuddleFloatingBar />);

    fireEvent.press(screen.getByTestId("huddle-bar-mute"));
    expect(mockToggleMute).toHaveBeenCalledTimes(1);
  });

  it("calls toggleCamera when camera button is pressed", () => {
    mockHuddleState.channelId = "ch-1";

    render(<HuddleFloatingBar />);

    fireEvent.press(screen.getByTestId("huddle-bar-camera"));
    expect(mockToggleCamera).toHaveBeenCalledTimes(1);
  });

  it("calls leaveHuddle when leave button is pressed", () => {
    mockHuddleState.channelId = "ch-1";

    render(<HuddleFloatingBar />);

    fireEvent.press(screen.getByTestId("huddle-bar-leave"));
    expect(mockLeaveHuddle).toHaveBeenCalledTimes(1);
  });
});
