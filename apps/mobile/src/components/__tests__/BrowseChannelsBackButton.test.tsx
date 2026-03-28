// Track options passed to each Stack.Screen by name
const screenOptions: Record<string, Record<string, unknown>> = {};

jest.mock("expo-router", () => {
  const React = require("react");
  const StackMock = ({ children }: { children: React.ReactNode }) => children;
  StackMock.Screen = ({ name, options }: { name: string; options?: Record<string, unknown> }) => {
    if (options) screenOptions[name] = options;
    return null;
  };
  return {
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
    useLocalSearchParams: () => ({ workspaceSlug: "acme" }),
    Stack: StackMock,
  };
});

import React from "react";
import { render } from "@testing-library/react-native";

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ authProvider: { getToken: jest.fn() }, user: { id: "u1" } }),
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
      brand: { primary: "#4A154B" },
    },
  }),
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

// Non-index screens that users navigate to and need a way back.
// "index" is excluded because it's the root tab screen.
const NON_INDEX_SCREENS = ["browse", "[channelId]", "channel-members", "dm/[channelId]"];

describe("ChannelsLayout - back button on non-index screens", () => {
  beforeEach(() => {
    Object.keys(screenOptions).forEach((k) => delete screenOptions[k]);
  });

  it.each(NON_INDEX_SCREENS)(
    "screen '%s' should configure a headerLeft back button",
    (screenName) => {
      render(<ChannelsLayout />);

      const opts = screenOptions[screenName];
      expect(opts).toBeDefined();
      expect(opts!.headerLeft).toBeDefined();
      expect(opts!.headerLeft).not.toBeNull();
    },
  );
});
