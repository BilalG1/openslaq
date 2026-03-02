import React from "react";
import { render, screen } from "@testing-library/react-native";
import WorkspaceSettingsScreen from "../../../app/(app)/[workspaceSlug]/workspace-settings";
import * as clientCore from "@openslaq/client-core";

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ workspaceSlug: "acme" }),
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
}));

jest.mock("@openslaq/client-core", () => ({
  listWorkspaceMembers: jest.fn(),
  updateMemberRole: jest.fn(),
  removeMember: jest.fn(),
  deleteWorkspace: jest.fn(),
  listInvites: jest.fn(),
  createInvite: jest.fn(),
  revokeInvite: jest.fn(),
  listWorkspaces: jest.fn(),
}));

const mockListMembers = clientCore.listWorkspaceMembers as jest.MockedFunction<typeof clientCore.listWorkspaceMembers>;
const mockListInvites = clientCore.listInvites as jest.MockedFunction<typeof clientCore.listInvites>;
const mockListWorkspaces = clientCore.listWorkspaces as jest.MockedFunction<typeof clientCore.listWorkspaces>;

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    authProvider: {
      getAccessToken: async () => "token",
      requireAccessToken: async () => "token",
      onAuthRequired: jest.fn(),
    },
    user: { id: "u-1" },
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
        dangerText: "#e01e5a",
      },
      brand: { primary: "#4A154B" },
    },
  }),
}));

const mockMembers = [
  { id: "u-1", displayName: "Alice", email: "alice@test.com", avatarUrl: null, role: "owner", createdAt: "", joinedAt: "" },
  { id: "u-2", displayName: "Bob", email: "bob@test.com", avatarUrl: null, role: "member", createdAt: "", joinedAt: "" },
] as clientCore.WorkspaceMember[];

const mockInvites = [
  { id: "inv-1", workspaceId: "ws-1", code: "abc123", createdBy: "u-1", maxUses: null, useCount: 2, expiresAt: "2026-03-01T00:00:00.000Z", revokedAt: null, createdAt: "" },
] as any[];

const mockWorkspaces = [
  { slug: "acme", name: "Acme Corp", role: "owner", id: "ws-1", createdAt: "", memberCount: 2 },
] as any[];

describe("WorkspaceSettingsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListMembers.mockResolvedValue(mockMembers);
    mockListWorkspaces.mockResolvedValue(mockWorkspaces);
    mockListInvites.mockResolvedValue(mockInvites);
  });

  it("renders members, invites, and delete sections after loading", async () => {
    jest.useFakeTimers();
    render(<WorkspaceSettingsScreen />);

    // Flush all microtasks (resolved promises) and timers
    await jest.runAllTimersAsync();

    // Members section
    expect(screen.getByText("Members (2)")).toBeTruthy();
    expect(screen.getByTestId("member-row-u-1")).toBeTruthy();
    expect(screen.getByTestId("member-row-u-2")).toBeTruthy();

    // Invites section (owner can see)
    expect(screen.getByText("Invites (1)")).toBeTruthy();
    expect(screen.getByTestId("invite-row-inv-1")).toBeTruthy();
    expect(screen.getByText("abc123")).toBeTruthy();
    expect(screen.getByTestId("create-invite-button")).toBeTruthy();

    // Delete section (owner only)
    expect(screen.getByTestId("delete-workspace-input")).toBeTruthy();
    expect(screen.getByTestId("delete-workspace-button")).toBeTruthy();

    jest.useRealTimers();
  });
});
