import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
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

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#fff",
        surfaceHover: "#e8e8e8",
        surfaceSecondary: "#f5f5f5",
        textPrimary: "#000",
        textSecondary: "#666",
        textMuted: "#888",
        textFaint: "#aaa",
        borderSecondary: "#ddd",
      },
      brand: { primary: "#007AFF" },
    },
  }),
}));

const mockFetchUserThreads = jest.fn();

jest.mock("@openslaq/client-core", () => ({
  fetchUserThreads: (...args: unknown[]) => mockFetchUserThreads(...args),
}));

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    authProvider: { requireAccessToken: jest.fn().mockResolvedValue("token") },
    user: { id: "user-1" },
  }),
}));

jest.mock("@/contexts/ChatStoreProvider", () => ({
  useChatStore: () => ({
    state: {},
    dispatch: jest.fn(),
  }),
}));

jest.mock("@/lib/api", () => ({
  api: {},
}));

import { ThreadsScreen } from "../ThreadsScreen";

beforeEach(() => {
  mockFetchUserThreads.mockReset();
});

describe("ThreadsScreen", () => {
  it("shows loading indicator initially", () => {
    mockFetchUserThreads.mockReturnValue(new Promise(() => {})); // never resolves
    render(<ThreadsScreen />);
    expect(screen.getByTestId("threads-screen")).toBeTruthy();
  });

  it("renders empty state when no threads", async () => {
    mockFetchUserThreads.mockResolvedValue([]);
    render(<ThreadsScreen />);
    await waitFor(() => {
      expect(screen.getByText("No threads yet")).toBeTruthy();
    });
  });

  it("renders threads grouped by channel", async () => {
    mockFetchUserThreads.mockResolvedValue([
      {
        message: {
          id: "msg-1",
          channelId: "ch-1",
          userId: "user-1",
          content: "Has anyone looked into the memory leak?",
          parentMessageId: null,
          replyCount: 5,
          latestReplyAt: new Date().toISOString(),
          attachments: [],
          reactions: [],
          mentions: [],
          senderDisplayName: "Alice",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        channelName: "engineering",
      },
      {
        message: {
          id: "msg-2",
          channelId: "ch-1",
          userId: "user-2",
          content: "RFC: Migrating to tRPC",
          parentMessageId: null,
          replyCount: 10,
          latestReplyAt: new Date().toISOString(),
          attachments: [],
          reactions: [],
          mentions: [],
          senderDisplayName: "Bob",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        channelName: "engineering",
      },
    ]);

    render(<ThreadsScreen />);
    await waitFor(() => {
      expect(screen.getByText("#engineering")).toBeTruthy();
      expect(screen.getByText("Alice")).toBeTruthy();
      expect(screen.getByText("Has anyone looked into the memory leak?")).toBeTruthy();
      expect(screen.getByText("5 replies")).toBeTruthy();
      expect(screen.getByText("Bob")).toBeTruthy();
      expect(screen.getByText("RFC: Migrating to tRPC")).toBeTruthy();
    });
  });

  it("shows error message on fetch failure", async () => {
    mockFetchUserThreads.mockRejectedValue(new Error("Network error"));
    render(<ThreadsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeTruthy();
    });
  });

  it("shows retry button on error and retries on press", async () => {
    mockFetchUserThreads.mockRejectedValue(new Error("Network error"));
    const { fireEvent } = require("@testing-library/react-native");
    render(<ThreadsScreen />);
    const retryButton = await screen.findByTestId("threads-retry");
    expect(retryButton).toBeTruthy();

    // Reset call count and make it succeed
    mockFetchUserThreads.mockClear();
    mockFetchUserThreads.mockResolvedValue([]);
    fireEvent.press(retryButton);

    await waitFor(() => {
      expect(mockFetchUserThreads).toHaveBeenCalled();
    });
  });
});
