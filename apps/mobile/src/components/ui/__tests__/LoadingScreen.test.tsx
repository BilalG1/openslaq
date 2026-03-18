import React from "react";
import { render, screen } from "@testing-library/react-native";
import { LoadingScreen } from "../LoadingScreen";

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#ffffff",
      },
      brand: {
        primary: "#007AFF",
      },
    },
  }),
}));

describe("LoadingScreen", () => {
  it("renders an ActivityIndicator", () => {
    render(<LoadingScreen testID="loading" />);
    expect(screen.getByTestId("loading")).toBeTruthy();
  });

  it("renders without testID", () => {
    const { toJSON } = render(<LoadingScreen />);
    expect(toJSON()).toBeTruthy();
  });
});
