import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import NoWorkspacesScreen from "../../../app/(app)/no-workspaces";

const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

let mockGetInviteResult: { workspaceName: string; workspaceSlug: string } | Error = {
  workspaceName: "Acme Corp",
  workspaceSlug: "acme-corp",
};
let mockAcceptInviteResult: { slug: string } | Error = { slug: "acme-corp" };

jest.mock("@openslaq/client-core", () => ({
  getInvite: jest.fn(() =>
    mockGetInviteResult instanceof Error
      ? Promise.reject(mockGetInviteResult)
      : Promise.resolve(mockGetInviteResult),
  ),
  acceptInvite: jest.fn(() =>
    mockAcceptInviteResult instanceof Error
      ? Promise.reject(mockAcceptInviteResult)
      : Promise.resolve(mockAcceptInviteResult),
  ),
}));

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    authProvider: {
      getAccessToken: async () => "token",
      requireAccessToken: async () => "token",
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
      colors: {
        surface: "#fff",
        surfaceSecondary: "#f0f0f0",
        surfaceTertiary: "#e0e0e0",
        textPrimary: "#000",
        textSecondary: "#666",
        textFaint: "#999",
        borderDefault: "#ddd",
        dangerText: "#dc2626",
      },
      brand: { primary: "#1264a3" },
    },
  }),
}));

describe("NoWorkspacesScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetInviteResult = { workspaceName: "Acme Corp", workspaceSlug: "acme-corp" };
    mockAcceptInviteResult = { slug: "acme-corp" };
  });

  it("renders welcome screen with invite input and create button", () => {
    render(<NoWorkspacesScreen />);

    expect(screen.getByTestId("no-workspaces-screen")).toBeTruthy();
    expect(screen.getByText("Welcome to OpenSlaq")).toBeTruthy();
    expect(screen.getByTestId("invite-link-input")).toBeTruthy();
    expect(screen.getByTestId("invite-lookup-button")).toBeTruthy();
    expect(screen.getByTestId("create-workspace-button")).toBeTruthy();
  });

  it("navigates to create-workspace screen", () => {
    render(<NoWorkspacesScreen />);

    fireEvent.press(screen.getByTestId("create-workspace-button"));

    expect(mockPush).toHaveBeenCalledWith("/(app)/create-workspace");
  });

  it("previews invite and accepts it", async () => {
    render(<NoWorkspacesScreen />);

    fireEvent.changeText(screen.getByTestId("invite-link-input"), "abc123");
    fireEvent.press(screen.getByTestId("invite-lookup-button"));

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeTruthy();
      expect(screen.getByTestId("invite-accept-button")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("invite-accept-button"));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/(app)/acme-corp/(channels)");
    });
  });

  it("extracts invite code from full URL", async () => {
    const { getInvite } = require("@openslaq/client-core");

    render(<NoWorkspacesScreen />);

    fireEvent.changeText(
      screen.getByTestId("invite-link-input"),
      "https://openslaq.com/invite/xyz789",
    );
    fireEvent.press(screen.getByTestId("invite-lookup-button"));

    await waitFor(() => {
      expect(getInvite).toHaveBeenCalledWith(expect.anything(), "xyz789");
    });
  });

  it("shows error for invalid invite", async () => {
    mockGetInviteResult = new Error("Not found");

    render(<NoWorkspacesScreen />);

    fireEvent.changeText(screen.getByTestId("invite-link-input"), "bad-code");
    fireEvent.press(screen.getByTestId("invite-lookup-button"));

    await waitFor(() => {
      expect(screen.getByTestId("no-workspaces-error")).toBeTruthy();
      expect(screen.getByText("Invalid or expired invite link")).toBeTruthy();
    });
  });

  it("shows error when accept fails", async () => {
    mockAcceptInviteResult = new Error("Failed");

    render(<NoWorkspacesScreen />);

    fireEvent.changeText(screen.getByTestId("invite-link-input"), "abc123");
    fireEvent.press(screen.getByTestId("invite-lookup-button"));

    await waitFor(() => {
      expect(screen.getByTestId("invite-accept-button")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("invite-accept-button"));

    await waitFor(() => {
      expect(screen.getByText("Failed to join workspace")).toBeTruthy();
    });
  });

  it("can cancel invite preview and go back to input", async () => {
    render(<NoWorkspacesScreen />);

    fireEvent.changeText(screen.getByTestId("invite-link-input"), "abc123");
    fireEvent.press(screen.getByTestId("invite-lookup-button"));

    await waitFor(() => {
      expect(screen.getByTestId("invite-cancel-button")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("invite-cancel-button"));

    expect(screen.getByTestId("invite-link-input")).toBeTruthy();
  });
});
