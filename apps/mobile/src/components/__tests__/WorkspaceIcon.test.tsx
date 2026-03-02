import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { WorkspaceIcon } from "../workspace/WorkspaceIcon";

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#fff",
        surfaceSecondary: "#f0f0f0",
        surfaceTertiary: "#e0e0e0",
        textPrimary: "#000",
        textSecondary: "#666",
      },
      brand: { primary: "#4A154B" },
    },
  }),
}));

describe("WorkspaceIcon", () => {
  it("renders initial from workspace name", () => {
    render(<WorkspaceIcon name="Acme Corp" isActive={false} onPress={jest.fn()} />);

    expect(screen.getByText("A")).toBeTruthy();
  });

  it("renders active state differently", () => {
    const { getByTestId } = render(
      <WorkspaceIcon name="Beta" isActive={true} onPress={jest.fn()} />,
    );

    expect(getByTestId("workspace-icon-Beta")).toBeTruthy();
    expect(screen.getByText("B")).toBeTruthy();
  });

  it("calls onPress when tapped", () => {
    const onPress = jest.fn();
    render(<WorkspaceIcon name="Test" isActive={false} onPress={onPress} />);

    fireEvent.press(screen.getByTestId("workspace-icon-Test"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
