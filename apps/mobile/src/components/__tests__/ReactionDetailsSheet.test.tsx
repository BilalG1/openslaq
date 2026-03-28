import React from "react";
import { render, screen } from "@testing-library/react-native";
import { ReactionDetailsSheet } from "../ReactionDetailsSheet";
import { asUserId } from "@openslaq/shared";

describe("ReactionDetailsSheet", () => {
  const members = [
    { id: asUserId("u1"), displayName: "Alice" },
    { id: asUserId("u2"), displayName: "Bob" },
    { id: asUserId("u3"), displayName: "Charlie" },
  ];

  it("renders the emoji at the top", () => {
    render(
      <ReactionDetailsSheet
        visible
        emoji="👍"
        userIds={[asUserId("u1")]}
        members={members}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByTestId("reaction-details-emoji")).toBeTruthy();
    expect(screen.getByText("👍")).toBeTruthy();
  });

  it("renders list of user display names who reacted", () => {
    render(
      <ReactionDetailsSheet
        visible
        emoji="❤️"
        userIds={[asUserId("u1"), asUserId("u2")]}
        members={members}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("shows user ID fallback for unknown users", () => {
    render(
      <ReactionDetailsSheet
        visible
        emoji="👍"
        userIds={[asUserId("unknown-user")]}
        members={members}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText("unknown-user")).toBeTruthy();
  });

  it("does not render when not visible", () => {
    render(
      <ReactionDetailsSheet
        visible={false}
        emoji="👍"
        userIds={[asUserId("u1")]}
        members={members}
        onClose={jest.fn()}
      />,
    );

    expect(screen.queryByTestId("reaction-details-emoji")).toBeNull();
  });

  it("shows reaction count", () => {
    render(
      <ReactionDetailsSheet
        visible
        emoji="🎉"
        userIds={[asUserId("u1"), asUserId("u2"), asUserId("u3")]}
        members={members}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText("3")).toBeTruthy();
  });
});
