import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native";

const mockFetchFiles = jest.fn();

jest.mock("@openslaq/client-core", () => ({
  fetchFiles: (...args: unknown[]) => mockFetchFiles(...args),
}));

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ workspaceSlug: "default" }),
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    authProvider: { requireAccessToken: jest.fn() },
    user: { id: "user-1" },
  }),
}));

jest.mock("@/contexts/ChatStoreProvider", () => ({
  useChatStore: () => ({
    state: { channels: [], dms: [], groupDms: [] },
    dispatch: jest.fn(),
  }),
}));

jest.mock("@/lib/api", () => ({
  api: {},
}));

jest.mock("@/lib/env", () => ({
  env: { EXPO_PUBLIC_API_URL: "http://localhost:3001" },
}));

const mockOpenSafeUrl = jest.fn();
jest.mock("@/utils/url-validation", () => ({
  openSafeUrl: (...args: unknown[]) => mockOpenSafeUrl(...args),
}));

import FilesBrowserScreen from "../../../app/(app)/[workspaceSlug]/files";

const makeMockFile = (overrides: Record<string, unknown> = {}) => ({
  id: "att-1",
  filename: "screenshot.png",
  mimeType: "image/png",
  size: 204800,
  category: "images" as const,
  downloadUrl: "/api/uploads/att-1/download",
  uploadedBy: "user-1",
  uploaderName: "Alice",
  channelId: "ch-1",
  channelName: "general",
  messageId: "msg-1",
  createdAt: "2026-03-01T12:00:00Z",
  ...overrides,
});

function renderWithData(data: { files: unknown[]; nextCursor: string | null }) {
  mockFetchFiles.mockImplementation(() => Promise.resolve(data));
  return render(<FilesBrowserScreen />);
}

describe("FilesBrowserScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state", () => {
    mockFetchFiles.mockReturnValue(new Promise(() => {}));
    render(<FilesBrowserScreen />);
    expect(screen.getByTestId("files-loading")).toBeTruthy();
  });

  it("renders empty state", async () => {
    renderWithData({ files: [], nextCursor: null });
    expect(await screen.findByTestId("files-empty")).toBeTruthy();
  });

  it("renders list of files", async () => {
    const files = [
      makeMockFile({ id: "att-1", filename: "photo.png" }),
      makeMockFile({ id: "att-2", filename: "report.pdf", category: "documents", mimeType: "application/pdf" }),
    ];
    renderWithData({ files, nextCursor: null });

    expect(await screen.findByTestId("file-row-att-1")).toBeTruthy();
    expect(screen.getByTestId("file-row-att-2")).toBeTruthy();
    expect(screen.getByText("photo.png")).toBeTruthy();
    expect(screen.getByText("report.pdf")).toBeTruthy();
  });

  it("renders all category filter chips", async () => {
    renderWithData({ files: [], nextCursor: null });

    expect(await screen.findByTestId("files-screen")).toBeTruthy();
    expect(screen.getByTestId("filter-chip-all")).toBeTruthy();
    expect(screen.getByTestId("filter-chip-images")).toBeTruthy();
    expect(screen.getByTestId("filter-chip-videos")).toBeTruthy();
    expect(screen.getByTestId("filter-chip-documents")).toBeTruthy();
    expect(screen.getByTestId("filter-chip-audio")).toBeTruthy();
    expect(screen.getByTestId("filter-chip-other")).toBeTruthy();
  });

  it("filters by category when chip is pressed", async () => {
    mockFetchFiles.mockImplementation(() =>
      Promise.resolve({ files: [], nextCursor: null }),
    );
    render(<FilesBrowserScreen />);

    const chip = await screen.findByTestId("filter-chip-images");

    // Record call count after initial load, then press the chip
    const countBefore = mockFetchFiles.mock.calls.length;

    fireEvent.press(chip);

    await waitFor(() => {
      // A new call should have been made with the images category
      const newCalls = mockFetchFiles.mock.calls.slice(countBefore);
      const hasImageCategory = newCalls.some(
        (call: unknown[]) => (call[1] as Record<string, unknown>).category === "images",
      );
      expect(hasImageCategory).toBe(true);
    });
  });

  it("paginates on end reached", async () => {
    mockFetchFiles.mockImplementation((_deps: unknown, params: Record<string, unknown>) => {
      if (params.cursor) {
        return Promise.resolve({
          files: [makeMockFile({ id: "att-2", filename: "second.png" })],
          nextCursor: null,
        });
      }
      return Promise.resolve({
        files: [makeMockFile({ id: "att-1" })],
        nextCursor: "cursor-1",
      });
    });
    render(<FilesBrowserScreen />);

    // Wait for initial data to render
    expect(await screen.findByTestId("file-row-att-1")).toBeTruthy();

    // Trigger load more via onEndReached
    const list = screen.getByTestId("files-list");
    fireEvent(list, "endReached");

    // Verify pagination call was made with cursor
    await waitFor(() => {
      const cursorCall = mockFetchFiles.mock.calls.find(
        (call: unknown[]) => (call[1] as Record<string, unknown>).cursor === "cursor-1",
      );
      expect(cursorCall).toBeTruthy();
    });
  });

  it("opens URL for non-image files", async () => {
    const file = makeMockFile({ id: "att-doc", filename: "report.pdf", category: "documents", mimeType: "application/pdf" });
    renderWithData({ files: [file], nextCursor: null });

    const row = await screen.findByTestId("file-row-att-doc");
    fireEvent.press(row);
    expect(mockOpenSafeUrl).toHaveBeenCalledWith("http://localhost:3001/api/uploads/att-doc/download");
  });

  it("opens image preview for image files", async () => {
    const file = makeMockFile({ id: "att-img", filename: "photo.png", category: "images" });
    renderWithData({ files: [file], nextCursor: null });

    const row = await screen.findByTestId("file-row-att-img");

    await act(() => {
      fireEvent.press(row);
    });

    expect(screen.getByTestId("file-preview-modal")).toBeTruthy();
  });

  it("navigates to channel on jump press", async () => {
    const file = makeMockFile({ id: "att-1", channelId: "ch-42" });
    renderWithData({ files: [file], nextCursor: null });

    const jump = await screen.findByTestId("file-jump-att-1");
    fireEvent.press(jump);
    expect(mockPush).toHaveBeenCalledWith("/(app)/default/(tabs)/(channels)/ch-42");
  });
});
