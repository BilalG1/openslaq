import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { Text } from "react-native";
import { BottomSheet } from "../BottomSheet";

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#fff",
        textPrimary: "#000",
        textFaint: "#999",
      },
    },
  }),
}));

describe("BottomSheet", () => {
  it("renders children when visible", () => {
    render(
      <BottomSheet visible onClose={jest.fn()} testID="sheet">
        <Text>Hello</Text>
      </BottomSheet>,
    );
    expect(screen.getByText("Hello")).toBeTruthy();
  });

  it("does not render children when not visible", () => {
    render(
      <BottomSheet visible={false} onClose={jest.fn()}>
        <Text>Hidden</Text>
      </BottomSheet>,
    );
    expect(screen.queryByText("Hidden")).toBeNull();
  });

  it("renders title when provided", () => {
    render(
      <BottomSheet visible onClose={jest.fn()} title="My Title">
        <Text>Content</Text>
      </BottomSheet>,
    );
    expect(screen.getByText("My Title")).toBeTruthy();
  });

  it("calls onClose when backdrop is pressed", () => {
    const onClose = jest.fn();
    render(
      <BottomSheet visible onClose={onClose} testID="sheet">
        <Text>Content</Text>
      </BottomSheet>,
    );
    act(() => {
      fireEvent.press(screen.getByTestId("sheet-backdrop"));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders with avoidKeyboard prop", () => {
    render(
      <BottomSheet visible onClose={jest.fn()} avoidKeyboard testID="sheet">
        <Text>Content</Text>
      </BottomSheet>,
    );
    expect(screen.getByText("Content")).toBeTruthy();
  });

  it("renders drag handle", () => {
    render(
      <BottomSheet visible onClose={jest.fn()} testID="sheet">
        <Text>Content</Text>
      </BottomSheet>,
    );
    expect(screen.getByTestId("drag-handle")).toBeTruthy();
  });
});
