import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => ({ workspaceSlug: "acme" }),
}));

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock("react-native-svg", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: View,
    Svg: (props: Record<string, unknown>) => <View {...props} />,
    Path: View,
    Line: View,
  };
});

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#fff",
        surfaceTertiary: "#f3f4f6",
        headerBg: "#111827",
        headerText: "#FFFFFF",
        headerSearchBg: "rgba(255,255,255,0.2)",
      },
      brand: { primary: "#1264a3" },
    },
  }),
}));

jest.mock("@/contexts/ChatStoreProvider", () => ({
  useChatStore: () => ({
    state: {
      workspaces: [{ slug: "acme", name: "Acme Corp" }],
      channels: [],
      dms: [],
      groupDms: [],
      unreadCounts: {},
      starredChannelIds: [],
      presence: {},
    },
  }),
}));

jest.mock("@/hooks/useCurrentUserProfile", () => ({
  useCurrentUserProfile: () => ({
    profile: { displayName: "Test User", avatarUrl: null },
    loading: false,
  }),
}));

const mockToggle = jest.fn();
jest.mock("@/contexts/WorkspaceDrawerContext", () => ({
  useWorkspaceDrawer: () => ({ toggle: mockToggle }),
}));

import { HomeHeader } from "../home/HomeHeader";

beforeEach(() => {
  mockPush.mockClear();
  mockToggle.mockClear();
});

describe("HomeHeader", () => {
  it("renders workspace name", () => {
    render(<HomeHeader />);
    expect(screen.getByText("Acme Corp")).toBeTruthy();
  });

  it("renders workspace icon button", () => {
    render(<HomeHeader />);
    expect(screen.getByTestId("workspace-icon-button")).toBeTruthy();
  });

  it("opens drawer when workspace icon is tapped", () => {
    render(<HomeHeader />);
    fireEvent.press(screen.getByTestId("workspace-icon-button"));
    expect(mockToggle).toHaveBeenCalled();
  });

  it("renders search pill", () => {
    render(<HomeHeader />);
    expect(screen.getByTestId("search-pill")).toBeTruthy();
    expect(screen.getByText("Jump to or search...")).toBeTruthy();
  });

  it("renders filter icon in search pill", () => {
    render(<HomeHeader />);
    expect(screen.getByTestId("filter-icon")).toBeTruthy();
  });

  it("navigates to search when search pill is pressed", () => {
    render(<HomeHeader />);
    fireEvent.press(screen.getByTestId("search-pill"));
    expect(mockPush).toHaveBeenCalledWith("/(app)/acme/search");
  });

  it("renders header avatar button", () => {
    render(<HomeHeader />);
    expect(screen.getByTestId("header-avatar-button")).toBeTruthy();
  });

  it("navigates to settings when avatar is pressed", () => {
    render(<HomeHeader />);
    fireEvent.press(screen.getByTestId("header-avatar-button"));
    expect(mockPush).toHaveBeenCalledWith("/(app)/acme/settings");
  });
});
