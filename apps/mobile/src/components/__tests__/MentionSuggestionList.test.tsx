import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { MentionSuggestionList } from "../MentionSuggestionList";
import type { MentionSuggestionItem } from "../MentionSuggestionList";

const mockMembers: MentionSuggestionItem[] = [
  { id: "user-1", displayName: "Alice" },
  { id: "user-2", displayName: "Bob" },
];

describe("MentionSuggestionList", () => {
  it("renders nothing when suggestions are empty", () => {
    render(
      <MentionSuggestionList suggestions={[]} onSelect={jest.fn()} />,
    );

    expect(screen.queryByTestId("mention-suggestion-list")).toBeNull();
  });

  it("renders suggestion items", () => {
    render(
      <MentionSuggestionList suggestions={mockMembers} onSelect={jest.fn()} />,
    );

    expect(screen.getByTestId("mention-suggestion-list")).toBeTruthy();
    expect(screen.getByTestId("mention-suggestion-user-1")).toBeTruthy();
    expect(screen.getByTestId("mention-suggestion-user-2")).toBeTruthy();
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("calls onSelect when suggestion is tapped", () => {
    const onSelect = jest.fn();
    render(
      <MentionSuggestionList suggestions={mockMembers} onSelect={onSelect} />,
    );

    fireEvent.press(screen.getByTestId("mention-suggestion-user-1"));

    expect(onSelect).toHaveBeenCalledWith(mockMembers[0]);
  });

  it("renders group mention with @ icon", () => {
    const groupItems: MentionSuggestionItem[] = [
      { id: "here", displayName: "@here — notify online members", isGroup: true },
    ];

    render(
      <MentionSuggestionList suggestions={groupItems} onSelect={jest.fn()} />,
    );

    expect(screen.getByTestId("mention-suggestion-here")).toBeTruthy();
    expect(screen.getByText("@")).toBeTruthy();
  });

  it("renders user initial in avatar circle", () => {
    render(
      <MentionSuggestionList suggestions={mockMembers} onSelect={jest.fn()} />,
    );

    expect(screen.getByText("A")).toBeTruthy();
    expect(screen.getByText("B")).toBeTruthy();
  });
});
