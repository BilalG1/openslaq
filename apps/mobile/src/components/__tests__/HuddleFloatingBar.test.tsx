import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { HuddleFloatingBar } from "../huddle/HuddleFloatingBar";

const mockPush = jest.fn();

let mockHuddleState = {
  channelId: null as string | null,
  connected: false,
  isMuted: false,
  minimized: false,
  room: null,
  leaveHuddle: jest.fn(),
  toggleMute: jest.fn(),
};

jest.mock("@livekit/react-native", () => ({
  VideoTrack: "VideoTrack",
}));

jest.mock("livekit-client", () => ({
  Track: { Source: { Camera: "camera", ScreenShare: "screen_share" } },
}));

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
  useRouter: () => ({ push: mockPush }),
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
      brand: { primary: "#1264a3", danger: "#dc2626" },
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
      minimized: false,
      room: null,
      leaveHuddle: jest.fn(),
      toggleMute: jest.fn(),
    };
  });

  it("returns null when not in a huddle", () => {
    const { toJSON } = render(<HuddleFloatingBar />);
    expect(toJSON()).toBeNull();
  });

  it("returns null when in a huddle but not minimized", () => {
    mockHuddleState.channelId = "ch-1";
    mockHuddleState.connected = true;
    mockHuddleState.minimized = false;

    const { toJSON } = render(<HuddleFloatingBar />);
    expect(toJSON()).toBeNull();
  });

  it("renders when in a huddle and minimized", () => {
    mockHuddleState.channelId = "ch-1";
    mockHuddleState.connected = true;
    mockHuddleState.minimized = true;

    render(<HuddleFloatingBar />);
    expect(screen.getByTestId("huddle-floating-bar")).toBeTruthy();
    expect(screen.getByText("G")).toBeTruthy();
  });

  it("shows green dot when connected and minimized", () => {
    mockHuddleState.channelId = "ch-1";
    mockHuddleState.connected = true;
    mockHuddleState.minimized = true;

    render(<HuddleFloatingBar />);
    expect(screen.getByTestId("huddle-floating-bar")).toBeTruthy();
  });

  it("shows avatar initial fallback when no video track", () => {
    mockHuddleState.channelId = "ch-1";
    mockHuddleState.minimized = true;

    render(<HuddleFloatingBar />);
    expect(screen.getByText("G")).toBeTruthy();
  });

  it("opens full screen huddle when tapped", () => {
    mockHuddleState.channelId = "ch-1";
    mockHuddleState.minimized = true;

    render(<HuddleFloatingBar />);
    fireEvent.press(screen.getByTestId("huddle-bar-expand"));
    expect(mockPush).toHaveBeenCalled();
  });

  it("does not show mute or leave controls", () => {
    mockHuddleState.channelId = "ch-1";
    mockHuddleState.minimized = true;

    render(<HuddleFloatingBar />);
    expect(screen.queryByTestId("huddle-bar-mute")).toBeNull();
    expect(screen.queryByTestId("huddle-bar-leave")).toBeNull();
  });

  it("shows DM user name for DM huddles", () => {
    mockHuddleState.channelId = "dm-1";
    mockHuddleState.minimized = true;

    jest.spyOn(require("@/contexts/ChatStoreProvider"), "useChatStore").mockReturnValue({
      state: {
        channels: [],
        dms: [{ channel: { id: "dm-1" }, otherUser: { displayName: "Alice" } }],
      },
    });

    render(<HuddleFloatingBar />);
    expect(screen.getByText("A")).toBeTruthy();
  });
});
