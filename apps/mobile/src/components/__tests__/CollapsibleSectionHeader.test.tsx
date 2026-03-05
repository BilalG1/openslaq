import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { CollapsibleSectionHeader } from "../CollapsibleSectionHeader";

jest.mock("react-native-svg", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: View,
    Svg: View,
    Path: View,
  };
});

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#fff",
        textFaint: "#999",
        textSecondary: "#666",
      },
    },
  }),
}));

describe("CollapsibleSectionHeader", () => {
  it("renders title", () => {
    render(
      <CollapsibleSectionHeader
        sectionKey="channels"
        title="Channels"
        collapsed={false}
        onToggle={() => {}}
      />,
    );

    expect(screen.getByText("Channels")).toBeTruthy();
  });

  it("shows down chevron when not collapsed", () => {
    render(
      <CollapsibleSectionHeader
        sectionKey="channels"
        title="Channels"
        collapsed={false}
        onToggle={() => {}}
      />,
    );

    expect(screen.getByTestId("chevron-down")).toBeTruthy();
  });

  it("shows right chevron when collapsed", () => {
    render(
      <CollapsibleSectionHeader
        sectionKey="channels"
        title="Channels"
        collapsed={true}
        onToggle={() => {}}
      />,
    );

    expect(screen.getByTestId("chevron-right")).toBeTruthy();
  });

  it("calls onToggle when pressed", () => {
    const onToggle = jest.fn();
    render(
      <CollapsibleSectionHeader
        sectionKey="channels"
        title="Channels"
        collapsed={false}
        onToggle={onToggle}
      />,
    );

    fireEvent.press(screen.getByTestId("section-header-channels"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("shows count when provided", () => {
    render(
      <CollapsibleSectionHeader
        sectionKey="unreads"
        title="Unreads"
        collapsed={false}
        onToggle={() => {}}
        count={5}
      />,
    );

    expect(screen.getByText("(5)")).toBeTruthy();
  });
});
