import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";

const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ code: "test-invite-code" }),
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock("@/lib/api", () => ({
  api: { test: true },
}));

const mockSetPendingInvite = jest.fn().mockResolvedValue(undefined);

jest.mock("@/lib/pending-invite", () => ({
  setPendingInvite: (...args: unknown[]) => mockSetPendingInvite(...args),
}));

let mockIsAuthenticated = true;
const mockAuthProvider = { getToken: jest.fn(), onAuthRequired: jest.fn() };

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    authProvider: mockAuthProvider,
  }),
}));

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#fff",
        surfaceSecondary: "#f0f0f0",
        surfaceTertiary: "#eee",
        textPrimary: "#000",
        textSecondary: "#666",
        textFaint: "#999",
        textMuted: "#888",
        dangerText: "#dc2626",
        borderDefault: "#ddd",
      },
      brand: { primary: "#1264a3" },
    },
  }),
}));

const mockGetInvite = jest.fn();
const mockAcceptInvite = jest.fn();

jest.mock("@openslaq/client-core", () => ({
  getInvite: (...args: unknown[]) => mockGetInvite(...args),
  acceptInvite: (...args: unknown[]) => mockAcceptInvite(...args),
}));

// Must import after mocks
import InviteAcceptScreen from "../../../app/invite/[code]";

beforeEach(() => {
  jest.clearAllMocks();
  mockIsAuthenticated = true;
  mockGetInvite.mockResolvedValue({ workspaceName: "Acme Corp", workspaceSlug: "acme" });
  mockAcceptInvite.mockResolvedValue({ slug: "acme" });
});

describe("InviteAcceptScreen", () => {
  it("redirects to sign-in when not authenticated", async () => {
    mockIsAuthenticated = false;
    render(<InviteAcceptScreen />);
    expect(mockSetPendingInvite).toHaveBeenCalledWith("test-invite-code");
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/(auth)/sign-in");
    });
  });

  it("shows workspace name after loading invite", async () => {
    render(<InviteAcceptScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("invite-preview-card")).toBeTruthy();
    });
    expect(screen.getByText("Acme Corp")).toBeTruthy();
    expect(screen.getByText("You've been invited!")).toBeTruthy();
  });

  it("shows error for invalid invite", async () => {
    mockGetInvite.mockRejectedValue(new Error("Not found"));
    render(<InviteAcceptScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("invite-error")).toBeTruthy();
    });
    expect(screen.getByText("Invalid or expired invite link")).toBeTruthy();
  });

  it("accepts invite and navigates to workspace", async () => {
    render(<InviteAcceptScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("invite-accept-button")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("invite-accept-button"));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/(app)/acme/(tabs)/(channels)");
    });
  });

  it("navigates back when cancel is pressed", async () => {
    render(<InviteAcceptScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("invite-cancel-button")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("invite-cancel-button"));
    expect(mockReplace).toHaveBeenCalledWith("/");
  });
});
