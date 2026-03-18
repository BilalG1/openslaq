import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Mock the contexts used by DraftsScreen
const mockRouter = { push: jest.fn(), back: jest.fn() };
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ workspaceSlug: "default" }),
  useRouter: () => mockRouter,
}));

const mockState = {
  channels: [
    { id: "ch-1", name: "general", type: "public", isArchived: false },
    { id: "ch-2", name: "random", type: "public", isArchived: false },
  ],
  dms: [
    {
      channel: { id: "dm-1", type: "dm" },
      otherUser: { id: "u-1", displayName: "Alice" },
    },
  ],
  groupDms: [],
};

jest.mock("@/contexts/ChatStoreProvider", () => ({
  useChatStore: () => ({ state: mockState }),
}));

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#1a1d21",
        textPrimary: "#fff",
        textSecondary: "#aaa",
        textMuted: "#888",
        textFaint: "#666",
        borderSecondary: "#333",
      },
      brand: { primary: "#1264a3", success: "#007a5a", danger: "#dc2626" },
    },
  }),
}));

import DraftsScreen from "../../../app/(app)/[workspaceSlug]/drafts";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("DraftsScreen", () => {
  it("shows loading state initially", () => {
    // Never resolve the promise so it stays loading
    (AsyncStorage.getAllKeys as jest.Mock).mockReturnValueOnce(new Promise(() => {}));

    render(<DraftsScreen />);

    expect(screen.getByTestId("drafts-loading")).toBeTruthy();
  });

  it("shows empty state when no drafts", async () => {
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([]);

    render(<DraftsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("drafts-empty")).toBeTruthy();
    });
    expect(screen.getByText("No drafts")).toBeTruthy();
  });

  it("lists drafts with channel names", async () => {
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([
      "openslaq-draft-ch-1",
      "openslaq-draft-dm-1",
    ]);
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([
      ["openslaq-draft-ch-1", "hello from general"],
      ["openslaq-draft-dm-1", "hey alice"],
    ]);

    render(<DraftsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("drafts-list")).toBeTruthy();
    });

    expect(screen.getByText("#general")).toBeTruthy();
    expect(screen.getByText("hello from general")).toBeTruthy();
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("hey alice")).toBeTruthy();
  });

  it("navigates to channel on press", async () => {
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([
      "openslaq-draft-ch-1",
    ]);
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([
      ["openslaq-draft-ch-1", "draft text"],
    ]);

    render(<DraftsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("draft-item-ch-1")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("draft-item-ch-1"));

    expect(mockRouter.push).toHaveBeenCalledWith(
      "/(app)/default/(tabs)/(channels)/ch-1",
    );
  });

  it("deletes draft when delete button pressed", async () => {
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([
      "openslaq-draft-ch-1",
    ]);
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([
      ["openslaq-draft-ch-1", "draft text"],
    ]);

    render(<DraftsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("draft-delete-ch-1")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("draft-delete-ch-1"));

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("openslaq-draft-ch-1");

    await waitFor(() => {
      expect(screen.queryByTestId("draft-item-ch-1")).toBeNull();
    });
  });
});
