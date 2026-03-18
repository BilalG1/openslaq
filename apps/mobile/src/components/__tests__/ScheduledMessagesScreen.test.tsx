import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

// Mock the client-core operations
const mockFetchScheduledMessages = jest.fn();
const mockDeleteScheduledMessageOp = jest.fn();
const mockUpdateScheduledMessageOp = jest.fn();

jest.mock("@openslaq/client-core", () => ({
  fetchScheduledMessages: (...args: unknown[]) => mockFetchScheduledMessages(...args),
  deleteScheduledMessageOp: (...args: unknown[]) => mockDeleteScheduledMessageOp(...args),
  updateScheduledMessageOp: (...args: unknown[]) => mockUpdateScheduledMessageOp(...args),
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ workspaceSlug: "default" }),
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    authProvider: { requireAccessToken: jest.fn() },
    user: { id: "user-1" },
  }),
}));

jest.mock("@/contexts/ChatStoreProvider", () => ({
  useChatStore: () => ({
    state: { channels: [], dms: [], groupDms: [] },
    dispatch: jest.fn(),
  }),
}));

jest.mock("@/lib/api", () => ({
  api: {},
}));

const mockDeps = { api: {}, auth: { requireAccessToken: jest.fn() }, dispatch: jest.fn(), getState: jest.fn() };
jest.mock("@/hooks/useOperationDeps", () => ({
  useOperationDeps: () => mockDeps,
}));

jest.mock("@/lib/routes", () => ({
  routes: {
    channel: (ws: string, id: string) => `/(app)/${ws}/(tabs)/(channels)/${id}`,
  },
}));

// Inline a minimal ScheduleMessageSheet mock
jest.mock("@/components/ScheduleMessageSheet", () => ({
  ScheduleMessageSheet: ({ visible, onSchedule }: { visible: boolean; onSchedule: (d: Date) => void; onClose: () => void }) => {
    if (!visible) return null;
    const { Pressable, Text, View } = require("react-native");
    return (
      <View testID="schedule-sheet-mock">
        <Pressable testID="mock-schedule-preset" onPress={() => onSchedule(new Date("2026-04-01T09:00:00"))}>
          <Text>Mock preset</Text>
        </Pressable>
      </View>
    );
  },
}));

import ScheduledMessagesScreen from "../../../app/(app)/[workspaceSlug]/scheduled-messages";

const makeMockItem = (overrides: Record<string, unknown> = {}) => ({
  id: "sm-1",
  channelId: "ch-1",
  userId: "user-1",
  content: "Hello future",
  attachmentIds: [],
  scheduledFor: new Date(Date.now() + 60 * 60_000).toISOString(),
  status: "pending" as const,
  failureReason: null,
  sentMessageId: null,
  createdAt: new Date().toISOString(),
  channelName: "general",
  ...overrides,
});

describe("ScheduledMessagesScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state", () => {
    mockFetchScheduledMessages.mockReturnValue(new Promise(() => {}));
    render(<ScheduledMessagesScreen />);
    expect(screen.getByTestId("scheduled-messages-loading")).toBeTruthy();
  });

  it("renders empty state", async () => {
    mockFetchScheduledMessages.mockResolvedValue([]);
    render(<ScheduledMessagesScreen />);
    await waitFor(() => {
      expect(screen.getByTestId("scheduled-messages-empty")).toBeTruthy();
    });
  });

  it("renders list of scheduled messages", async () => {
    const items = [
      makeMockItem({ id: "sm-1", content: "Hello future" }),
      makeMockItem({ id: "sm-2", content: "Another one", status: "sent" }),
    ];
    mockFetchScheduledMessages.mockResolvedValue(items);
    render(<ScheduledMessagesScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("scheduled-messages-list")).toBeTruthy();
    });

    expect(screen.getByTestId("scheduled-item-sm-1")).toBeTruthy();
    expect(screen.getByTestId("scheduled-item-sm-2")).toBeTruthy();
  });

  it("shows delete button for pending items", async () => {
    mockFetchScheduledMessages.mockResolvedValue([makeMockItem()]);
    render(<ScheduledMessagesScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("scheduled-delete-sm-1")).toBeTruthy();
    });
  });

  it("calls delete on confirm", async () => {
    mockFetchScheduledMessages.mockResolvedValue([makeMockItem()]);
    mockDeleteScheduledMessageOp.mockResolvedValue(undefined);
    jest.spyOn(Alert, "alert");

    render(<ScheduledMessagesScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("scheduled-delete-sm-1")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("scheduled-delete-sm-1"));

    // Alert.alert should have been called with delete confirmation
    expect(Alert.alert).toHaveBeenCalledWith(
      "Delete Scheduled Message",
      "Are you sure?",
      expect.any(Array),
    );
  });

  it("shows reschedule button for pending items", async () => {
    mockFetchScheduledMessages.mockResolvedValue([makeMockItem()]);
    render(<ScheduledMessagesScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("scheduled-reschedule-sm-1")).toBeTruthy();
    });
  });

  it("displays status badges correctly", async () => {
    const items = [
      makeMockItem({ id: "sm-1", status: "pending" }),
      makeMockItem({ id: "sm-2", status: "sent" }),
      makeMockItem({ id: "sm-3", status: "failed", failureReason: "Channel archived" }),
    ];
    mockFetchScheduledMessages.mockResolvedValue(items);
    render(<ScheduledMessagesScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("scheduled-status-sm-1")).toBeTruthy();
    });

    expect(screen.getByTestId("scheduled-status-sm-2")).toBeTruthy();
    expect(screen.getByTestId("scheduled-status-sm-3")).toBeTruthy();
  });
});
