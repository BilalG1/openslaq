import React from "react";
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { EmptyState } from "../EmptyState";

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        textFaint: "#999999",
      },
    },
  }),
}));

describe("EmptyState", () => {
  it("renders the message text", () => {
    render(<EmptyState message="No items" testID="empty" />);
    expect(screen.getByText("No items")).toBeTruthy();
  });

  it("renders with a testID", () => {
    render(<EmptyState message="Nothing here" testID="empty-state" />);
    expect(screen.getByTestId("empty-state")).toBeTruthy();
  });

  it("renders an icon when provided", () => {
    render(
      <EmptyState
        message="No messages"
        icon={<Text testID="icon">icon</Text>}
        testID="empty"
      />,
    );
    expect(screen.getByTestId("icon")).toBeTruthy();
    expect(screen.getByText("No messages")).toBeTruthy();
  });

  it("renders without an icon", () => {
    const { toJSON } = render(<EmptyState message="Empty" />);
    expect(toJSON()).toBeTruthy();
  });
});
