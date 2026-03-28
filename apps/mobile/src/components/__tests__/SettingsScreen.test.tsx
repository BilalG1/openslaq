import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

const mockPush = jest.fn();
const mockDispatch = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => ({ workspaceSlug: "acme" }),
}));

jest.mock("react-native-svg", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: View,
    Svg: (props: Record<string, unknown>) => <View {...props} />,
    Path: View,
    Rect: View,
    Line: View,
    Circle: View,
    Polyline: View,
  };
});

jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#fff",
        surfaceSecondary: "#f5f5f5",
        surfaceTertiary: "#eee",
        surfaceHover: "#e8e8e8",
        textPrimary: "#000",
        textSecondary: "#666",
        textFaint: "#999",
        textMuted: "#888",
        borderDefault: "#ddd",
        borderSecondary: "#eee",
        dangerBg: "#fee",
        dangerText: "#dc2626",
        headerText: "#fff",
      },
      brand: { primary: "#1264a3" },
    },
  }),
}));

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    authProvider: { requireAccessToken: jest.fn() },
    user: { id: "u-1" },
    signOut: jest.fn(),
  }),
}));

jest.mock("@/contexts/ServerContext", () => ({
  useServer: () => ({
    apiClient: {},
  }),
}));

let mockPresence: Record<string, unknown> = {};

jest.mock("@/contexts/ChatStoreProvider", () => ({
  useChatStore: () => ({
    dispatch: mockDispatch,
    state: {
      workspaces: [{ slug: "acme", role: "owner", name: "Acme", memberCount: 1 }],
      presence: mockPresence,
    },
  }),
}));

jest.mock("@openslaq/client-core", () => ({
  getCurrentUser: jest.fn().mockResolvedValue({
    id: "u-1",
    displayName: "Alice",
    email: "alice@example.com",
    avatarUrl: null,
  }),
  updateCurrentUser: jest.fn(),
  STATUS_PRESETS: [],
  DURATION_OPTIONS: ["dont_clear"],
  DURATION_LABELS: { dont_clear: "Don't clear" },
  durationToExpiresAt: jest.fn(),
  setUserStatus: jest.fn(),
  clearUserStatus: jest.fn(),
  handleUserStatusUpdated: jest.fn(),
}));

jest.mock("@/hooks/useRouteParams", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "acme" }),
}));

jest.mock("@/lib/api", () => ({
  api: {},
}));

import SettingsScreen from "../../../app/(app)/[workspaceSlug]/settings";

beforeEach(() => {
  mockPush.mockClear();
  mockDispatch.mockClear();
  mockPresence = {};
});

describe("SettingsScreen", () => {
  it("renders Set Status row with placeholder when no status is set", async () => {
    render(<SettingsScreen />);
    const row = await screen.findByTestId("set-status-row");
    expect(row).toBeTruthy();
    expect(screen.getByText("Set a status")).toBeTruthy();
  });

  it("renders Set Status row with current status when set", async () => {
    mockPresence = {
      "u-1": { statusEmoji: "🏠", statusText: "Working from home", online: true },
    };
    render(<SettingsScreen />);
    await screen.findByTestId("set-status-row");
    expect(screen.getByText("🏠")).toBeTruthy();
    expect(screen.getByText("Working from home")).toBeTruthy();
  });

  it("opens SetStatusModal when Set Status row is pressed", async () => {
    render(<SettingsScreen />);
    const row = await screen.findByTestId("set-status-row");
    fireEvent.press(row);
    expect(screen.getByTestId("set-status-modal")).toBeTruthy();
  });
});
