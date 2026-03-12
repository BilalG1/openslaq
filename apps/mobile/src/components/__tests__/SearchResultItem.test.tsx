import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import type { SearchResultItem as SearchResult } from "@openslaq/shared";
import { SearchResultItem } from "../search/SearchResultItem";

function makeItem(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    messageId: "msg-1" as any,
    channelId: "ch-1" as any,
    channelName: "general",
    channelType: "public",
    userId: "u-1" as any,
    userDisplayName: "Alice",
    content: "hello world",
    headline: "<mark>hello</mark> world",
    parentMessageId: null,
    createdAt: new Date().toISOString(),
    rank: 1,
    ...overrides,
  };
}

describe("SearchResultItem", () => {
  it("renders #channelName for public channels", () => {
    render(<SearchResultItem item={makeItem()} onPress={jest.fn()} />);

    expect(screen.getByTestId("search-result-channel")).toBeTruthy();
    expect(screen.getByText(/# general/)).toBeTruthy();
  });

  it("renders lock icon for private channels", () => {
    render(
      <SearchResultItem
        item={makeItem({ channelType: "private", channelName: "secret" })}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByTestId("icon-Lock")).toBeTruthy();
  });

  it("shows 'in thread' badge when parentMessageId present", () => {
    render(
      <SearchResultItem
        item={makeItem({ parentMessageId: "parent-1" as any })}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByTestId("search-result-thread-badge")).toBeTruthy();
  });

  it("does not show thread badge when parentMessageId is null", () => {
    render(
      <SearchResultItem
        item={makeItem({ parentMessageId: null })}
        onPress={jest.fn()}
      />,
    );

    expect(screen.queryByTestId("search-result-thread-badge")).toBeNull();
  });

  it("calls onPress when tapped", () => {
    const onPress = jest.fn();
    const item = makeItem();
    render(<SearchResultItem item={item} onPress={onPress} />);

    fireEvent.press(screen.getByTestId(`search-result-${item.messageId}`));
    expect(onPress).toHaveBeenCalledWith(item);
  });

  it("renders sender display name", () => {
    render(
      <SearchResultItem item={makeItem({ userDisplayName: "Bob" })} onPress={jest.fn()} />,
    );

    expect(screen.getByTestId("search-result-sender").props.children).toBe("Bob");
  });
});
