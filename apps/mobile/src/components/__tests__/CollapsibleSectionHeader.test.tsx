import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { CollapsibleSectionHeader } from "../CollapsibleSectionHeader";

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#fff",
        textFaint: "#999",
      },
    },
  }),
}));

describe("CollapsibleSectionHeader", () => {
  it("renders title and icon", () => {
    render(
      <CollapsibleSectionHeader
        sectionKey="channels"
        title="Channels"
        icon="#"
        collapsed={false}
        onToggle={() => {}}
      />,
    );

    expect(screen.getByText("Channels")).toBeTruthy();
    expect(screen.getByText("#")).toBeTruthy();
  });

  it("shows expanded chevron when not collapsed", () => {
    render(
      <CollapsibleSectionHeader
        sectionKey="channels"
        title="Channels"
        icon="#"
        collapsed={false}
        onToggle={() => {}}
      />,
    );

    expect(screen.getByText("\u25BE")).toBeTruthy();
  });

  it("shows collapsed chevron when collapsed", () => {
    render(
      <CollapsibleSectionHeader
        sectionKey="channels"
        title="Channels"
        icon="#"
        collapsed={true}
        onToggle={() => {}}
      />,
    );

    expect(screen.getByText("\u25B8")).toBeTruthy();
  });

  it("calls onToggle when pressed", () => {
    const onToggle = jest.fn();
    render(
      <CollapsibleSectionHeader
        sectionKey="channels"
        title="Channels"
        icon="#"
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
        icon="\uD83D\uDCE8"
        collapsed={false}
        onToggle={() => {}}
        count={5}
      />,
    );

    expect(screen.getByText("(5)")).toBeTruthy();
  });
});
