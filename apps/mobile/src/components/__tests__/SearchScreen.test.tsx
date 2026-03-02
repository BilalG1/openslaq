import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { SearchScreen } from "../search/SearchScreen";

const mockUpdateFilters = jest.fn();
const mockReset = jest.fn();
const mockLoadMore = jest.fn();
const mockPush = jest.fn();

let mockFilters = { q: "", channelId: undefined, userId: undefined, fromDate: undefined, toDate: undefined };
let mockResults: any[] = [];
let mockTotal = 0;
let mockLoading = false;
let mockError: string | null = null;
let mockHasMore = false;

jest.mock("@/hooks/useSearch", () => ({
  useSearch: () => ({
    filters: mockFilters,
    updateFilters: mockUpdateFilters,
    results: mockResults,
    total: mockTotal,
    loading: mockLoading,
    error: mockError,
    loadMore: mockLoadMore,
    hasMore: mockHasMore,
    reset: mockReset,
    channels: [],
    dms: [],
  }),
}));

// Mock sub-components: FilterChips and modals as null, but SearchResultItem as pressable stub
jest.mock("../search/FilterChips", () => ({
  FilterChips: () => null,
}));
jest.mock("../search/ChannelPickerModal", () => ({
  ChannelPickerModal: () => null,
}));
jest.mock("../search/MemberPickerModal", () => ({
  MemberPickerModal: () => null,
}));
jest.mock("../search/DatePickerModal", () => ({
  DatePickerModal: () => null,
}));

// SearchResultItem stub that fires onPress with the item
jest.mock("../search/SearchResultItem", () => {
  const { Pressable, Text } = require("react-native");
  return {
    SearchResultItem: ({ item, onPress }: any) => (
      <Pressable testID={`search-result-${item.messageId}`} onPress={() => onPress(item)}>
        <Text>{item.userDisplayName}</Text>
      </Pressable>
    ),
  };
});

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#fff",
        textPrimary: "#000",
        textFaint: "#999",
        borderDefault: "#ddd",
        dangerText: "#d00",
      },
      brand: { primary: "#4A154B" },
    },
  }),
}));

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ workspaceSlug: "test-ws" }),
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: mockBack,
    canGoBack: jest.fn(() => false),
  }),
}));

function makeResult(overrides: Record<string, any> = {}) {
  return {
    messageId: "msg-1",
    channelId: "ch-1",
    channelName: "general",
    channelType: "public",
    userId: "u-1",
    userDisplayName: "User One",
    content: "hello",
    headline: "hello",
    parentMessageId: null,
    createdAt: "2025-01-01T00:00:00Z",
    rank: 1,
    ...overrides,
  };
}

describe("SearchScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFilters = { q: "", channelId: undefined, userId: undefined, fromDate: undefined, toDate: undefined };
    mockResults = [];
    mockTotal = 0;
    mockLoading = false;
    mockError = null;
    mockHasMore = false;
  });

  it("renders search input and empty state", () => {
    render(<SearchScreen />);

    expect(screen.getByTestId("search-input")).toBeTruthy();
    expect(screen.getByTestId("search-empty-state")).toBeTruthy();
  });

  it("clears search and returns to empty state", () => {
    mockFilters = { ...mockFilters, q: "test query" };

    render(<SearchScreen />);

    expect(screen.getByTestId("search-clear-button")).toBeTruthy();

    fireEvent.press(screen.getByTestId("search-clear-button"));

    expect(mockReset).toHaveBeenCalled();
  });

  it("shows no-results state", () => {
    mockFilters = { ...mockFilters, q: "nonsense query" };
    mockResults = [];
    mockLoading = false;
    mockError = null;

    render(<SearchScreen />);

    expect(screen.getByTestId("search-no-results")).toBeTruthy();
  });

  it("back button calls router.back()", () => {
    render(<SearchScreen />);

    fireEvent.press(screen.getByTestId("search-back-button"));

    expect(mockReset).toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalled();
  });

  it("shows loading state when loading with no results", () => {
    mockFilters = { ...mockFilters, q: "test" };
    mockLoading = true;
    mockResults = [];

    render(<SearchScreen />);

    expect(screen.getByTestId("search-loading")).toBeTruthy();
  });

  it("shows error state", () => {
    mockFilters = { ...mockFilters, q: "test" };
    mockError = "Something went wrong";

    render(<SearchScreen />);

    expect(screen.getByTestId("search-error")).toBeTruthy();
    expect(screen.getByText("Something went wrong")).toBeTruthy();
  });

  it("shows singular '1 result' count", () => {
    mockFilters = { ...mockFilters, q: "hello" };
    mockResults = [makeResult()];
    mockTotal = 1;

    render(<SearchScreen />);

    expect(screen.getByTestId("search-result-count")).toBeTruthy();
    expect(screen.getByText("1 result")).toBeTruthy();
  });

  it("shows plural '5 results' count", () => {
    mockFilters = { ...mockFilters, q: "hello" };
    mockResults = Array.from({ length: 5 }, (_, i) => makeResult({ messageId: `msg-${i}` }));
    mockTotal = 5;

    render(<SearchScreen />);

    expect(screen.getByText("5 results")).toBeTruthy();
  });

  it("result press navigates to thread route when parentMessageId exists", () => {
    mockFilters = { ...mockFilters, q: "hello" };
    mockResults = [makeResult({ parentMessageId: "parent-1" })];
    mockTotal = 1;

    render(<SearchScreen />);

    fireEvent.press(screen.getByTestId("search-result-msg-1"));

    expect(mockPush).toHaveBeenCalledWith("/(app)/test-ws/thread/parent-1");
  });

  it("result press navigates to DM route when channelType is dm", () => {
    mockFilters = { ...mockFilters, q: "hello" };
    mockResults = [makeResult({ channelType: "dm", channelId: "dm-ch-1" })];
    mockTotal = 1;

    render(<SearchScreen />);

    fireEvent.press(screen.getByTestId("search-result-msg-1"));

    expect(mockPush).toHaveBeenCalledWith("/(app)/test-ws/(tabs)/(channels)/dm/dm-ch-1");
  });

  it("result press navigates to channel route for regular messages", () => {
    mockFilters = { ...mockFilters, q: "hello" };
    mockResults = [makeResult()];
    mockTotal = 1;

    render(<SearchScreen />);

    fireEvent.press(screen.getByTestId("search-result-msg-1"));

    expect(mockPush).toHaveBeenCalledWith("/(app)/test-ws/(tabs)/(channels)/ch-1");
  });

  it("FlatList onEndReached calls loadMore when hasMore", () => {
    mockFilters = { ...mockFilters, q: "hello" };
    mockResults = Array.from({ length: 20 }, (_, i) => makeResult({ messageId: `msg-${i}` }));
    mockTotal = 25;
    mockHasMore = true;

    render(<SearchScreen />);

    const flatList = screen.getByTestId("search-results-list");
    fireEvent(flatList, "onEndReached");

    expect(mockLoadMore).toHaveBeenCalled();
  });
});
