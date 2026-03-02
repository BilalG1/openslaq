import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import CreateWorkspaceScreen from "../../../app/(app)/create-workspace";

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

let mockCreateWorkspaceResult: { ok: boolean; slug?: string; error?: string } = {
  ok: true,
  slug: "acme-corp",
};

jest.mock("@openslaq/client-core", () => ({
  createWorkspace: jest.fn(() => Promise.resolve(mockCreateWorkspaceResult)),
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
        dangerText: "#e01e5a",
      },
      brand: { primary: "#4A154B" },
    },
  }),
}));

describe("CreateWorkspaceScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateWorkspaceResult = { ok: true, slug: "acme-corp" };
  });

  it("renders the form", () => {
    render(<CreateWorkspaceScreen />);

    expect(screen.getByTestId("create-workspace-screen")).toBeTruthy();
    expect(screen.getByTestId("create-workspace-name-input")).toBeTruthy();
    expect(screen.getByTestId("create-workspace-submit")).toBeTruthy();
  });

  it("navigates on successful creation", async () => {
    render(<CreateWorkspaceScreen />);

    fireEvent.changeText(screen.getByTestId("create-workspace-name-input"), "Acme Corp");
    fireEvent.press(screen.getByTestId("create-workspace-submit"));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/(app)/acme-corp/(channels)");
    });
  });

  it("shows error on failed creation", async () => {
    mockCreateWorkspaceResult = { ok: false, error: "Name taken" };

    render(<CreateWorkspaceScreen />);

    fireEvent.changeText(screen.getByTestId("create-workspace-name-input"), "Acme Corp");
    fireEvent.press(screen.getByTestId("create-workspace-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("create-workspace-error")).toBeTruthy();
      expect(screen.getByText("Name taken")).toBeTruthy();
    });
  });

  it("does not submit with empty name", () => {
    const { createWorkspace } = require("@openslaq/client-core");

    render(<CreateWorkspaceScreen />);

    fireEvent.press(screen.getByTestId("create-workspace-submit"));

    expect(createWorkspace).not.toHaveBeenCalled();
  });
});
