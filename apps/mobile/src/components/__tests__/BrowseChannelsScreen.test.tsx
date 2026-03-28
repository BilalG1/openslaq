import React from "react";
import { render, screen } from "@testing-library/react-native";

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ workspaceSlug: "acme" }),
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useFocusEffect: () => {},
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#fff",
        surfaceSecondary: "#f5f5f5",
        surfaceTertiary: "#eee",
        textPrimary: "#000",
        textSecondary: "#666",
        textFaint: "#999",
        textMuted: "#888",
        borderDefault: "#ddd",
        borderSecondary: "#eee",
        headerText: "#fff",
      },
      brand: { primary: "#1264a3", danger: "#dc2626" },
    },
  }),
}));

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    authProvider: { requireAccessToken: jest.fn() },
    user: { id: "u-1" },
  }),
}));

let mockStateChannels: Array<{ id: string; name: string }> = [{ id: "ch-1", name: "general" }];

jest.mock("@/contexts/ChatStoreProvider", () => ({
  useChatStore: () => ({
    dispatch: jest.fn(),
    state: {
      channels: mockStateChannels,
      workspaces: [{ slug: "acme", role: "owner", name: "Acme", memberCount: 1 }],
    },
  }),
}));

jest.mock("@/contexts/SocketProvider", () => ({
  useSocket: () => ({ socket: null }),
}));

jest.mock("@/lib/api", () => ({ api: {} }));

const browseChannelsList = [
  { id: "ch-1", name: "general", isMember: true, memberCount: 5, isArchived: false, type: "public", workspaceId: "ws-1", createdAt: "", createdBy: "u-1", description: null, displayName: null },
  { id: "ch-2", name: "random", isMember: false, memberCount: 3, isArchived: false, type: "public", workspaceId: "ws-1", createdAt: "", createdBy: "u-1", description: null, displayName: null },
  { id: "ch-3", name: "secret", isMember: false, memberCount: 2, isArchived: false, type: "private", workspaceId: "ws-1", createdAt: "", createdBy: "u-1", description: null, displayName: null },
];

// Make browseChannels resolve synchronously by using a resolved promise
jest.mock("@openslaq/client-core", () => ({
  browseChannels: jest.fn().mockResolvedValue(browseChannelsList),
  joinChannel: jest.fn().mockResolvedValue(undefined),
  unarchiveChannel: jest.fn().mockResolvedValue(undefined),
}));

import BrowseChannelsScreen from "../../../app/(app)/[workspaceSlug]/(tabs)/(channels)/browse";

describe("BrowseChannelsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStateChannels = [{ id: "ch-1", name: "general" }];
  });

  it("renders channel list after loading", async () => {
    jest.useFakeTimers();
    render(<BrowseChannelsScreen />);
    // Flush the resolved promise + state updates
    await jest.runAllTimersAsync();
    jest.useRealTimers();

    expect(screen.getByText("general")).toBeTruthy();
    expect(screen.getByText("random")).toBeTruthy();
  });

  it("derives isMember from global state, not API response", async () => {
    // API says ch-2 isMember: false, but global state has ch-2
    mockStateChannels = [
      { id: "ch-1", name: "general" },
      { id: "ch-2", name: "random" },
    ];

    jest.useFakeTimers();
    render(<BrowseChannelsScreen />);
    await jest.runAllTimersAsync();
    jest.useRealTimers();

    // Both channels should show "Joined" since both are in global state
    const joinedLabels = screen.getAllByText("Joined");
    expect(joinedLabels.length).toBe(2);
  });

  it("shows lock icon for private channels and # for public channels", async () => {
    jest.useFakeTimers();
    render(<BrowseChannelsScreen />);
    await jest.runAllTimersAsync();
    jest.useRealTimers();

    // Public channels show # prefix
    const hashIcons = screen.getAllByText("#");
    expect(hashIcons.length).toBe(2); // general and random are public

    // Private channel shows lock icon
    expect(screen.getByTestId("browse-lock-icon-ch-3")).toBeTruthy();
  });

  it("shows Join button when channel is not in global state", async () => {
    // Only ch-1 in global state, ch-2 is not
    mockStateChannels = [{ id: "ch-1", name: "general" }];

    jest.useFakeTimers();
    render(<BrowseChannelsScreen />);
    await jest.runAllTimersAsync();
    jest.useRealTimers();

    expect(screen.getByText("Joined")).toBeTruthy();
    expect(screen.getAllByText("Join").length).toBe(2); // ch-2 and ch-3 not in global state
  });
});
