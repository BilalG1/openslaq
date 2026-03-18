import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import PreferencesScreen from "../../../app/(app)/[workspaceSlug]/preferences";

const mockSetThemePreference = jest.fn();
let mockThemePreference = "system";

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      brand: { primary: "#1264a3" },
      colors: {
        surface: "#fff",
        surfaceSecondary: "#f0f0f0",
        textPrimary: "#000",
        textSecondary: "#666",
        borderDefault: "#ddd",
      },
    },
    themePreference: mockThemePreference,
    setThemePreference: mockSetThemePreference,
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockThemePreference = "system";
});

describe("PreferencesScreen", () => {
  it("renders all three theme options", () => {
    render(<PreferencesScreen />);
    expect(screen.getByTestId("preferences-screen")).toBeTruthy();
    expect(screen.getByTestId("theme-option-system")).toBeTruthy();
    expect(screen.getByTestId("theme-option-light")).toBeTruthy();
    expect(screen.getByTestId("theme-option-dark")).toBeTruthy();
    expect(screen.getByText("System")).toBeTruthy();
    expect(screen.getByText("Light")).toBeTruthy();
    expect(screen.getByText("Dark")).toBeTruthy();
  });

  it("shows checkmark on the active option (system by default)", () => {
    render(<PreferencesScreen />);
    expect(screen.getByTestId("theme-option-system-check")).toBeTruthy();
    expect(screen.queryByTestId("theme-option-light-check")).toBeNull();
    expect(screen.queryByTestId("theme-option-dark-check")).toBeNull();
  });

  it("shows checkmark on dark when themePreference is dark", () => {
    mockThemePreference = "dark";
    render(<PreferencesScreen />);
    expect(screen.queryByTestId("theme-option-system-check")).toBeNull();
    expect(screen.getByTestId("theme-option-dark-check")).toBeTruthy();
  });

  it("calls setThemePreference when tapping light", () => {
    render(<PreferencesScreen />);
    fireEvent.press(screen.getByTestId("theme-option-light"));
    expect(mockSetThemePreference).toHaveBeenCalledWith("light");
  });

  it("calls setThemePreference when tapping dark", () => {
    render(<PreferencesScreen />);
    fireEvent.press(screen.getByTestId("theme-option-dark"));
    expect(mockSetThemePreference).toHaveBeenCalledWith("dark");
  });

  it("calls setThemePreference when tapping system", () => {
    mockThemePreference = "dark";
    render(<PreferencesScreen />);
    fireEvent.press(screen.getByTestId("theme-option-system"));
    expect(mockSetThemePreference).toHaveBeenCalledWith("system");
  });

  it("renders section header and description", () => {
    render(<PreferencesScreen />);
    expect(screen.getByText("Appearance")).toBeTruthy();
    expect(screen.getByText("Choose your color mode")).toBeTruthy();
  });

  it("shows subtitle for system option", () => {
    render(<PreferencesScreen />);
    expect(screen.getByText("Match your device settings")).toBeTruthy();
  });
});
