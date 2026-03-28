import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#fff",
        textPrimary: "#000",
        textSecondary: "#666",
      },
      brand: { primary: "#1264a3" },
    },
  }),
}));

import NotFoundScreen from "../../../app/+not-found";

describe("NotFoundScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders not found message", () => {
    render(<NotFoundScreen />);
    expect(screen.getByText("Page not found")).toBeTruthy();
    expect(screen.getByText("This link doesn't match any page in the app.")).toBeTruthy();
  });

  it("navigates home when button is pressed", () => {
    render(<NotFoundScreen />);
    fireEvent.press(screen.getByTestId("go-home-button"));
    expect(mockReplace).toHaveBeenCalledWith("/");
  });
});
