import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { JoinWorkspaceForm } from "../JoinWorkspaceForm";

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
        headerText: "#fff",
        borderDefault: "#ddd",
        dangerText: "#dc2626",
      },
      brand: { primary: "#1264a3" },
    },
  }),
}));

describe("JoinWorkspaceForm", () => {
  const onJoined = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetInviteResult = { workspaceName: "Acme Corp", workspaceSlug: "acme-corp" };
    mockAcceptInviteResult = { slug: "acme-corp" };
  });

  it("renders invite input and lookup button", () => {
    render(<JoinWorkspaceForm onJoined={onJoined} />);

    expect(screen.getByTestId("invite-link-input")).toBeTruthy();
    expect(screen.getByTestId("invite-lookup-button")).toBeTruthy();
  });

  it("previews invite and accepts it", async () => {
    render(<JoinWorkspaceForm onJoined={onJoined} />);

    fireEvent.changeText(screen.getByTestId("invite-link-input"), "abc123");
    fireEvent.press(screen.getByTestId("invite-lookup-button"));

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeTruthy();
      expect(screen.getByTestId("invite-accept-button")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("invite-accept-button"));

    await waitFor(() => {
      expect(onJoined).toHaveBeenCalledWith("acme-corp");
    });
  });

  it("extracts invite code from full URL", async () => {
    const { getInvite } = require("@openslaq/client-core");

    render(<JoinWorkspaceForm onJoined={onJoined} />);

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

    render(<JoinWorkspaceForm onJoined={onJoined} />);

    fireEvent.changeText(screen.getByTestId("invite-link-input"), "bad-code");
    fireEvent.press(screen.getByTestId("invite-lookup-button"));

    await waitFor(() => {
      expect(screen.getByTestId("join-workspace-error")).toBeTruthy();
      expect(screen.getByText("Invalid or expired invite link")).toBeTruthy();
    });
  });

  it("shows error when accept fails", async () => {
    mockAcceptInviteResult = new Error("Failed");

    render(<JoinWorkspaceForm onJoined={onJoined} />);

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
    render(<JoinWorkspaceForm onJoined={onJoined} />);

    fireEvent.changeText(screen.getByTestId("invite-link-input"), "abc123");
    fireEvent.press(screen.getByTestId("invite-lookup-button"));

    await waitFor(() => {
      expect(screen.getByTestId("invite-cancel-button")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("invite-cancel-button"));

    expect(screen.getByTestId("invite-link-input")).toBeTruthy();
  });
});
