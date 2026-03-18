import React from "react";
import { render, screen } from "@testing-library/react-native";
import { UnreadBadge } from "../UnreadBadge";

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      interaction: {
        badgeUnreadBg: "#FF0000",
        badgeUnreadText: "#FFFFFF",
      },
    },
  }),
}));

describe("UnreadBadge", () => {
  it("renders the count when positive", () => {
    render(<UnreadBadge count={5} />);
    expect(screen.getByText("5")).toBeTruthy();
  });

  it("returns null when count is 0", () => {
    const { toJSON } = render(<UnreadBadge count={0} />);
    expect(toJSON()).toBeNull();
  });

  it("returns null when count is negative", () => {
    const { toJSON } = render(<UnreadBadge count={-1} />);
    expect(toJSON()).toBeNull();
  });

  it("caps display at 99+", () => {
    render(<UnreadBadge count={100} />);
    expect(screen.getByText("99+")).toBeTruthy();
  });

  it("shows 99 without cap", () => {
    render(<UnreadBadge count={99} />);
    expect(screen.getByText("99")).toBeTruthy();
  });
});
