import React from "react";
import { render, screen } from "@testing-library/react-native";
import { TypingIndicator } from "../TypingIndicator";
import type { TypingUser } from "@/hooks/useTypingTracking";
import { asUserId } from "@openslaq/shared";

function makeTypingUser(overrides: Omit<Partial<TypingUser>, "userId"> & { userId: string; displayName: string }): TypingUser {
  const { userId, ...rest } = overrides;
  return {
    expiresAt: Date.now() + 5000,
    ...rest,
    userId: asUserId(userId),
  };
}

describe("TypingIndicator", () => {
  it("returns null when no users are typing", () => {
    const { toJSON } = render(<TypingIndicator typingUsers={[]} />);
    expect(toJSON()).toBeNull();
  });

  it("shows single user typing", () => {
    render(
      <TypingIndicator
        typingUsers={[makeTypingUser({ userId: "u1", displayName: "Alice" })]}
      />,
    );

    expect(screen.getByText("Alice is typing...")).toBeTruthy();
  });

  it("shows two users typing", () => {
    render(
      <TypingIndicator
        typingUsers={[
          makeTypingUser({ userId: "u1", displayName: "Alice" }),
          makeTypingUser({ userId: "u2", displayName: "Bob" }),
        ]}
      />,
    );

    expect(screen.getByText("Alice and Bob are typing...")).toBeTruthy();
  });

  it("shows 3+ users typing with count", () => {
    render(
      <TypingIndicator
        typingUsers={[
          makeTypingUser({ userId: "u1", displayName: "Alice" }),
          makeTypingUser({ userId: "u2", displayName: "Bob" }),
          makeTypingUser({ userId: "u3", displayName: "Charlie" }),
        ]}
      />,
    );

    expect(screen.getByText("Alice and 2 others are typing...")).toBeTruthy();
  });

  it("has testID when visible", () => {
    render(
      <TypingIndicator
        typingUsers={[makeTypingUser({ userId: "u1", displayName: "Alice" })]}
      />,
    );

    expect(screen.getByTestId("typing-indicator")).toBeTruthy();
  });
});
