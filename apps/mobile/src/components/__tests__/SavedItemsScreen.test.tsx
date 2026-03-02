import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import type { SavedMessageItem } from "@openslaq/client-core";
import { asMessageId, asChannelId, asUserId } from "@openslaq/shared";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => ({ workspaceSlug: "acme" }),
}));

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#fff",
        surfaceSecondary: "#f0f0f0",
        surfaceHover: "#e8e8e8",
        surfaceTertiary: "#e0e0e0",
        textPrimary: "#000",
        textSecondary: "#666",
        textFaint: "#999",
        borderSecondary: "#eee",
      },
      brand: { primary: "#4A154B", danger: "#ef4444" },
    },
  }),
}));

const mockDispatch = jest.fn();
jest.mock("@/contexts/ChatStoreProvider", () => ({
  useChatStore: () => ({
    state: {
      savedMessageIds: [],
      ui: { bootstrapLoading: false },
    },
    dispatch: mockDispatch,
  }),
}));

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    authProvider: { requireAccessToken: jest.fn(() => "token") },
  }),
}));

jest.mock("@/lib/api", () => ({
  api: {},
}));

const mockFetchSavedMessages = jest.fn();
const mockUnsaveMessageOp = jest.fn();

jest.mock("@openslaq/client-core", () => ({
  fetchSavedMessages: (...args: unknown[]) => mockFetchSavedMessages(...args),
  unsaveMessageOp: (...args: unknown[]) => mockUnsaveMessageOp(...args),
}));

// Must import after mocks
import SavedItemsScreen from "../../../app/(app)/[workspaceSlug]/saved-items";

function makeSavedItem(id: string, content: string, channelName: string): SavedMessageItem {
  return {
    message: {
      id: asMessageId(id),
      channelId: asChannelId("ch-1"),
      userId: asUserId("user-1"),
      senderDisplayName: "Alice",
      content,
      createdAt: "2025-01-01T12:00:00Z",
      updatedAt: "2025-01-01T12:00:00Z",
      parentMessageId: null,
      latestReplyAt: null,
      reactions: [],
      replyCount: 0,
      attachments: [],
      mentions: [],
    },
    channelName,
    savedAt: "2025-01-02T10:00:00Z",
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchSavedMessages.mockResolvedValue([]);
  mockUnsaveMessageOp.mockResolvedValue(undefined);
});

describe("SavedItemsScreen", () => {
  it("shows loading spinner initially", () => {
    mockFetchSavedMessages.mockReturnValue(new Promise(() => {})); // never resolves
    render(<SavedItemsScreen />);
    expect(screen.getByTestId("saved-items-loading")).toBeTruthy();
  });

  it("shows empty state when no saved messages", async () => {
    mockFetchSavedMessages.mockResolvedValue([]);
    render(<SavedItemsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("saved-items-empty")).toBeTruthy();
    });
    expect(screen.getByText("No saved messages")).toBeTruthy();
  });

  it("renders saved messages with channel names and content", async () => {
    mockFetchSavedMessages.mockResolvedValue([
      makeSavedItem("msg-1", "Hello world", "general"),
      makeSavedItem("msg-2", "Important note", "random"),
    ]);

    render(<SavedItemsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("saved-item-msg-1")).toBeTruthy();
    });
    expect(screen.getByText("#general")).toBeTruthy();
    expect(screen.getByText("Hello world")).toBeTruthy();
    expect(screen.getByTestId("saved-item-msg-2")).toBeTruthy();
    expect(screen.getByText("#random")).toBeTruthy();
    expect(screen.getByText("Important note")).toBeTruthy();
  });

  it("remove button calls unsaveMessageOp and removes item from list", async () => {
    mockFetchSavedMessages.mockResolvedValue([
      makeSavedItem("msg-1", "Hello world", "general"),
    ]);

    render(<SavedItemsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("saved-item-msg-1")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("saved-item-remove-msg-1"));

    await waitFor(() => {
      expect(mockUnsaveMessageOp).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.queryByTestId("saved-item-msg-1")).toBeNull();
    });
  });

  it("tapping a message navigates to the channel", async () => {
    mockFetchSavedMessages.mockResolvedValue([
      makeSavedItem("msg-1", "Hello world", "general"),
    ]);

    render(<SavedItemsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("saved-item-msg-1")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("saved-item-msg-1"));

    expect(mockPush).toHaveBeenCalledWith("/(app)/acme/(channels)/ch-1");
  });
});
