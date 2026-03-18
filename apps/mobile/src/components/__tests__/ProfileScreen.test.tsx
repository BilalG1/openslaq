import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";

// --- Mocks ---

const mockListWorkspaceMembers = jest.fn();
const mockCreateDm = jest.fn();
const mockJoinHuddle = jest.fn();
const mockDispatch = jest.fn();
const mockPush = jest.fn();

let mockPresence: Record<string, any> = {};

jest.mock("@openslaq/client-core", () => ({
  listWorkspaceMembers: (...args: any[]) => mockListWorkspaceMembers(...args),
  createDm: (...args: any[]) => mockCreateDm(...args),
  handleUserStatusUpdated: jest.fn((p) => ({ type: "presence/userStatusUpdated", payload: p })),
  setUserStatus: jest.fn(),
  clearUserStatus: jest.fn(),
  STATUS_PRESETS: [],
  DURATION_OPTIONS: [],
  DURATION_LABELS: {},
  durationToExpiresAt: jest.fn(() => null),
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ workspaceSlug: "test-ws", userId: mockTargetUserId }),
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    authProvider: { onAuthRequired: jest.fn() },
    user: { id: mockCurrentUserId },
  }),
}));

jest.mock("@/contexts/ChatStoreProvider", () => ({
  useChatStore: () => ({
    state: { presence: mockPresence },
    dispatch: mockDispatch,
  }),
}));

jest.mock("@/contexts/HuddleProvider", () => ({
  useHuddle: () => ({ joinHuddle: mockJoinHuddle }),
}));

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      brand: { primary: "#1264a3" },
      colors: {
        surface: "#fff",
        surfaceSecondary: "#f5f5f5",
        surfaceTertiary: "#eee",
        textPrimary: "#000",
        textSecondary: "#444",
        textMuted: "#666",
        textFaint: "#999",
        borderDefault: "#ddd",
      },
    },
  }),
}));

jest.mock("@/components/SetStatusModal", () => ({
  SetStatusModal: ({ visible }: { visible: boolean }) =>
    visible ? <MockSetStatusModal /> : null,
}));

function MockSetStatusModal() {
  const { Text } = require("react-native");
  return <Text testID="set-status-modal-mock">Status Modal</Text>;
}

jest.mock("@/lib/api", () => ({
  api: {},
}));

// Dynamic test state
let mockCurrentUserId = "current-user";
let mockTargetUserId = "other-user";

// Import after mocks
import ProfileScreen from "../../../app/(app)/[workspaceSlug]/profile/[userId]";

const baseMember = {
  id: "other-user",
  displayName: "Alice Smith",
  email: "alice@test.com",
  avatarUrl: null,
  role: "member",
  createdAt: "2026-01-15T00:00:00.000Z",
  joinedAt: "2026-02-15T12:00:00.000Z",
};

const ownMember = {
  ...baseMember,
  id: "current-user",
  displayName: "Me",
  email: "me@test.com",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPresence = {};
  mockCurrentUserId = "current-user";
  mockTargetUserId = "other-user";
  mockListWorkspaceMembers.mockResolvedValue([baseMember, ownMember]);
});

describe("ProfileScreen", () => {
  it("shows status emoji and text when present in presence", async () => {
    mockPresence = {
      "other-user": {
        online: true,
        lastSeenAt: null,
        statusEmoji: "📅",
        statusText: "In a meeting",
        statusExpiresAt: null,
      },
    };

    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("profile-display-name")).toBeTruthy();
    });

    expect(screen.getByTestId("profile-status")).toBeTruthy();
    expect(screen.getByText("📅")).toBeTruthy();
    expect(screen.getByText("In a meeting")).toBeTruthy();
  });

  it("does not show status when expired", async () => {
    mockPresence = {
      "other-user": {
        online: true,
        lastSeenAt: null,
        statusEmoji: "📅",
        statusText: "In a meeting",
        statusExpiresAt: new Date(Date.now() - 60000).toISOString(),
      },
    };

    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("profile-display-name")).toBeTruthy();
    });

    expect(screen.queryByTestId("profile-status")).toBeNull();
  });

  it('shows "Set a status" on own profile when no status', async () => {
    mockTargetUserId = "current-user";

    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("profile-display-name")).toBeTruthy();
    });

    expect(screen.getByTestId("profile-edit-status")).toBeTruthy();
    expect(screen.getByText("Set a status")).toBeTruthy();
  });

  it('shows "Edit Status" on own profile when status exists', async () => {
    mockTargetUserId = "current-user";
    mockPresence = {
      "current-user": {
        online: true,
        lastSeenAt: null,
        statusEmoji: "🏠",
        statusText: "Working remotely",
        statusExpiresAt: null,
      },
    };

    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("profile-display-name")).toBeTruthy();
    });

    expect(screen.getByTestId("profile-edit-status")).toBeTruthy();
    expect(screen.getByText("Edit Status")).toBeTruthy();
  });

  it('shows "Edit Profile" on own profile', async () => {
    mockTargetUserId = "current-user";

    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("profile-display-name")).toBeTruthy();
    });

    expect(screen.getByTestId("profile-edit-profile")).toBeTruthy();
    expect(screen.getByText("Edit Profile")).toBeTruthy();
  });

  it('does NOT show "Message" on own profile', async () => {
    mockTargetUserId = "current-user";

    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("profile-display-name")).toBeTruthy();
    });

    expect(screen.queryByTestId("profile-send-message")).toBeNull();
  });

  it("shows member since date", async () => {
    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("profile-display-name")).toBeTruthy();
    });

    expect(screen.getByTestId("profile-member-since")).toBeTruthy();
    expect(screen.getByText(/Member since February 2026/)).toBeTruthy();
  });

  it("shows last seen for offline users", async () => {
    mockPresence = {
      "other-user": {
        online: false,
        lastSeenAt: "2026-02-20T10:00:00.000Z",
        statusEmoji: null,
        statusText: null,
        statusExpiresAt: null,
      },
    };

    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("profile-display-name")).toBeTruthy();
    });

    expect(screen.getByTestId("profile-presence")).toBeTruthy();
    expect(screen.getByText(/Last seen Feb 20/)).toBeTruthy();
  });

  it("shows Online for online users", async () => {
    mockPresence = {
      "other-user": {
        online: true,
        lastSeenAt: null,
      },
    };

    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("profile-display-name")).toBeTruthy();
    });

    expect(screen.getByText("Online")).toBeTruthy();
  });

  it('shows "Message" and "Huddle" for other users', async () => {
    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("profile-display-name")).toBeTruthy();
    });

    expect(screen.getByTestId("profile-send-message")).toBeTruthy();
    expect(screen.getByText("Message")).toBeTruthy();
    expect(screen.getByTestId("profile-huddle")).toBeTruthy();
    expect(screen.getByText("Huddle")).toBeTruthy();
  });
});
