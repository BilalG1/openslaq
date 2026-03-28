// Track screenOptions passed to the Stack component
const mockStackScreenOptions: Record<string, unknown> = {};

jest.mock("expo-router", () => {
  const React = require("react");
  const StackMock = ({
    children,
    screenOptions,
  }: {
    children: React.ReactNode;
    screenOptions?: Record<string, unknown>;
  }) => {
    if (screenOptions) Object.assign(mockStackScreenOptions, screenOptions);
    return children;
  };
  StackMock.Screen = () => null;
  return {
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
    useLocalSearchParams: () => ({ workspaceSlug: "acme" }),
    Stack: StackMock,
  };
});

const mockSurface = "#1a1a1a";
const mockTextPrimary = "#e0e0e0";

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: mockSurface,
        surfaceSecondary: "#222",
        surfaceTertiary: "#333",
        textPrimary: mockTextPrimary,
        textSecondary: "#999",
      },
      brand: { primary: "#4A154B" },
    },
  }),
}));

import React from "react";
import { render } from "@testing-library/react-native";

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ authProvider: { getToken: jest.fn() }, user: { id: "u1" } }),
}));

jest.mock("@/contexts/ChatStoreProvider", () => ({
  useChatStore: () => ({
    state: {
      workspaces: [{ slug: "acme", name: "Acme", role: "owner" }],
      workspaceSlug: "acme",
    },
    dispatch: jest.fn(),
  }),
}));

jest.mock("@/lib/api", () => ({ api: {} }));
jest.mock("@/components/CreateChannelModal", () => ({ CreateChannelModal: () => null }));
jest.mock("@/components/NewDmModal", () => ({ NewDmModal: () => null }));
jest.mock("@/contexts/HomeActionsContext", () => ({
  HomeActionsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import ChannelsLayout from "../../../app/(app)/[workspaceSlug]/(tabs)/(channels)/_layout";

describe("ChannelsLayout - header respects theme colors", () => {
  beforeEach(() => {
    for (const key of Object.keys(mockStackScreenOptions)) {
      delete mockStackScreenOptions[key];
    }
  });

  it("sets headerStyle backgroundColor to theme surface color", () => {
    render(<ChannelsLayout />);

    expect(mockStackScreenOptions.headerStyle).toEqual({
      backgroundColor: "#1a1a1a",
    });
  });

  it("sets headerTintColor to theme text color", () => {
    render(<ChannelsLayout />);

    expect(mockStackScreenOptions.headerTintColor).toBe("#e0e0e0");
  });

  it("sets headerTitleStyle color to theme text color", () => {
    render(<ChannelsLayout />);

    expect(mockStackScreenOptions.headerTitleStyle).toEqual({
      color: "#e0e0e0",
    });
  });

  it("sets contentStyle backgroundColor to theme surface color", () => {
    render(<ChannelsLayout />);

    expect(mockStackScreenOptions.contentStyle).toEqual({
      backgroundColor: "#1a1a1a",
    });
  });
});
