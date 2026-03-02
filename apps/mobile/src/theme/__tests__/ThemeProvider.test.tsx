import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { MobileThemeProvider, useMobileTheme } from "../ThemeProvider";

let mockThemePreference = "system";

jest.mock("@/lib/theme-preferences", () => ({
  getThemePreference: jest.fn(() => Promise.resolve(mockThemePreference)),
  setThemePreference: jest.fn(() => Promise.resolve()),
}));

jest.mock("@openslaq/shared", () => ({
  getMobileTheme: jest.fn((mode: string) => ({
    colors: {
      surface: mode === "dark" ? "#1a1a1a" : "#ffffff",
      textPrimary: mode === "dark" ? "#fff" : "#000",
    },
    brand: { primary: "#4A154B" },
  })),
}));

const { setThemePreference: persistMock } = require("@/lib/theme-preferences");

function Probe() {
  const { mode, themePreference, setThemePreference } = useMobileTheme();
  return (
    <>
      <Text testID="mode">{mode}</Text>
      <Text testID="preference">{themePreference}</Text>
      <TouchableOpacity testID="setDark" onPress={() => setThemePreference("dark")} />
      <TouchableOpacity testID="setLight" onPress={() => setThemePreference("light")} />
    </>
  );
}

describe("MobileThemeProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockThemePreference = "system";
  });

  it("defaults to system preference with mode resolved from system color scheme", async () => {
    render(
      <MobileThemeProvider>
        <Probe />
      </MobileThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("preference").children.join("")).toBe("system");
    });
    // In test env, useColorScheme returns null/undefined → defaults to "light"
    expect(screen.getByTestId("mode").children.join("")).toBe("light");
  });

  it("setThemePreference('dark') updates mode and persists", async () => {
    render(
      <MobileThemeProvider>
        <Probe />
      </MobileThemeProvider>,
    );

    // Wait for initial useEffect to settle before interacting
    await waitFor(() => {
      expect(screen.getByTestId("preference").children.join("")).toBe("system");
    });

    fireEvent.press(screen.getByTestId("setDark"));

    await waitFor(() => {
      expect(screen.getByTestId("mode").children.join("")).toBe("dark");
    });
    expect(screen.getByTestId("preference").children.join("")).toBe("dark");
    expect(persistMock).toHaveBeenCalledWith("dark");
  });

  it("loads saved preference on mount", async () => {
    mockThemePreference = "dark";

    render(
      <MobileThemeProvider>
        <Probe />
      </MobileThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("preference").children.join("")).toBe("dark");
    });
    expect(screen.getByTestId("mode").children.join("")).toBe("dark");
  });

  it("setThemePreference('light') after dark updates correctly", async () => {
    mockThemePreference = "dark";

    render(
      <MobileThemeProvider>
        <Probe />
      </MobileThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("mode").children.join("")).toBe("dark");
    });

    fireEvent.press(screen.getByTestId("setLight"));

    await waitFor(() => {
      expect(screen.getByTestId("mode").children.join("")).toBe("light");
    });
    expect(persistMock).toHaveBeenCalledWith("light");
  });

  it("useMobileTheme returns light fallback outside provider", () => {
    render(<Probe />);

    expect(screen.getByTestId("mode").children.join("")).toBe("light");
    expect(screen.getByTestId("preference").children.join("")).toBe("system");
  });
});
