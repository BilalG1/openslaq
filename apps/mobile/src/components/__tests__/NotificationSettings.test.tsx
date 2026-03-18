import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import * as Notifications from "expo-notifications";
import { Linking } from "react-native";
import NotificationSettingsScreen from "../../../app/(app)/[workspaceSlug]/notification-settings";
import * as clientCore from "@openslaq/client-core";

jest.mock("@openslaq/client-core", () => ({
  getGlobalNotificationPrefs: jest.fn(),
  updateGlobalNotificationPrefs: jest.fn(),
}));

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    authProvider: {
      requireAccessToken: jest.fn().mockResolvedValue("test-token"),
      onAuthRequired: jest.fn(),
    },
  }),
}));

jest.mock("@/lib/api", () => ({
  api: {},
}));

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
  }),
}));

const mockGetPrefs = clientCore.getGlobalNotificationPrefs as jest.MockedFunction<
  typeof clientCore.getGlobalNotificationPrefs
>;
const mockUpdatePrefs = clientCore.updateGlobalNotificationPrefs as jest.MockedFunction<
  typeof clientCore.updateGlobalNotificationPrefs
>;
const mockGetPermissions = Notifications.getPermissionsAsync as jest.MockedFunction<
  typeof Notifications.getPermissionsAsync
>;
const mockRequestPermissions = Notifications.requestPermissionsAsync as jest.MockedFunction<
  typeof Notifications.requestPermissionsAsync
>;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockGetPrefs.mockResolvedValue({ pushEnabled: false, soundEnabled: true });
  mockUpdatePrefs.mockResolvedValue({ pushEnabled: true, soundEnabled: true });
  mockGetPermissions.mockResolvedValue({
    status: "undetermined" as any,
    granted: false,
    canAskAgain: true,
    expires: "never",
  });
  mockRequestPermissions.mockResolvedValue({
    status: "granted" as any,
    granted: true,
    canAskAgain: true,
    expires: "never",
  });
});

afterEach(() => {
  jest.useRealTimers();
});

async function renderScreen() {
  render(<NotificationSettingsScreen />);
  await jest.runAllTimersAsync();
}

describe("NotificationSettingsScreen", () => {
  it("renders push toggle and sound toggle", async () => {
    await renderScreen();
    expect(screen.getByTestId("push-toggle")).toBeTruthy();
    expect(screen.getByTestId("sound-toggle")).toBeTruthy();
    expect(screen.getByText("Push Notifications")).toBeTruthy();
    expect(screen.getByText("Sound")).toBeTruthy();
  });

  it("toggle on calls requestPermissionsAsync", async () => {
    await renderScreen();
    const pushToggle = screen.getByTestId("push-toggle");
    fireEvent(pushToggle, "valueChange", true);
    await jest.runAllTimersAsync();
    expect(mockRequestPermissions).toHaveBeenCalled();
  });

  it("persists enabled state on toggle on via API", async () => {
    await renderScreen();
    const pushToggle = screen.getByTestId("push-toggle");
    fireEvent(pushToggle, "valueChange", true);
    await jest.runAllTimersAsync();
    expect(mockUpdatePrefs).toHaveBeenCalledWith(
      expect.any(Object),
      { pushEnabled: true },
    );
  });

  it("persists enabled false on toggle off via API", async () => {
    mockGetPrefs.mockResolvedValue({ pushEnabled: true, soundEnabled: true });
    mockGetPermissions.mockResolvedValue({
      status: "granted" as any,
      granted: true,
      canAskAgain: true,
      expires: "never",
    });
    await renderScreen();
    const pushToggle = screen.getByTestId("push-toggle");
    fireEvent(pushToggle, "valueChange", false);
    await jest.runAllTimersAsync();
    expect(mockUpdatePrefs).toHaveBeenCalledWith(
      expect.any(Object),
      { pushEnabled: false },
    );
  });

  it("shows denied banner when permission denied", async () => {
    mockGetPermissions.mockResolvedValue({
      status: "denied" as any,
      granted: false,
      canAskAgain: false,
      expires: "never",
    });
    await renderScreen();
    expect(screen.getByTestId("permission-denied-banner")).toBeTruthy();
    expect(screen.getByTestId("open-settings-button")).toBeTruthy();
  });

  it("opens device settings when 'Open Settings' pressed", async () => {
    mockGetPermissions.mockResolvedValue({
      status: "denied" as any,
      granted: false,
      canAskAgain: false,
      expires: "never",
    });
    const spy = jest.spyOn(Linking, "openSettings").mockResolvedValue(undefined);
    await renderScreen();
    fireEvent.press(screen.getByTestId("open-settings-button"));
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("sound toggle disabled when push is off", async () => {
    await renderScreen();
    const soundToggle = screen.getByTestId("sound-toggle");
    expect(soundToggle.props.disabled).toBe(true);
  });

  it("sound toggle enabled when push is on", async () => {
    mockGetPrefs.mockResolvedValue({ pushEnabled: true, soundEnabled: true });
    mockGetPermissions.mockResolvedValue({
      status: "granted" as any,
      granted: true,
      canAskAgain: true,
      expires: "never",
    });
    await renderScreen();
    const soundToggle = screen.getByTestId("sound-toggle");
    expect(soundToggle.props.disabled).toBe(false);
  });

  it("persists sound toggle change via API", async () => {
    mockGetPrefs.mockResolvedValue({ pushEnabled: true, soundEnabled: true });
    mockGetPermissions.mockResolvedValue({
      status: "granted" as any,
      granted: true,
      canAskAgain: true,
      expires: "never",
    });
    await renderScreen();
    const soundToggle = screen.getByTestId("sound-toggle");
    fireEvent(soundToggle, "valueChange", false);
    await jest.runAllTimersAsync();
    expect(mockUpdatePrefs).toHaveBeenCalledWith(
      expect.any(Object),
      { soundEnabled: false },
    );
  });
});
