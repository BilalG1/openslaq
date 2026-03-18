import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { Alert } from "react-native";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => ({ workspaceSlug: "acme" }),
}));

const mockAuthProvider = { getToken: jest.fn().mockResolvedValue("test-token") };

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    authProvider: mockAuthProvider,
  }),
}));

const mockState = {
  channels: [],
  dms: [],
  groupDms: [],
  savedMessageIds: [],
  activeHuddles: {},
};

const mockDispatch = jest.fn();

jest.mock("@/contexts/ChatStoreProvider", () => ({
  useChatStore: () => ({
    state: mockState,
    dispatch: mockDispatch,
  }),
}));

jest.mock("@/theme/ThemeProvider", () => ({
  useMobileTheme: () => ({
    theme: {
      colors: {
        surface: "#1a1a1a",
        surfaceSecondary: "#2a2a2a",
        surfaceTertiary: "#3a3a3a",
        surfaceHover: "#333",
        textPrimary: "#fff",
        textSecondary: "#aaa",
        textMuted: "#888",
        textFaint: "#666",
        borderSecondary: "#333",
      },
      brand: {
        primary: "#4a9eff",
        success: "#22c55e",
        danger: "#ef4444",
      },
    },
  }),
}));

jest.mock("@/lib/api", () => ({
  api: {},
}));

jest.mock("@/components/ScheduleMessageSheet", () => ({
  ScheduleMessageSheet: () => null,
}));

const mockFetchDrafts = jest.fn();
const mockFetchScheduledMessages = jest.fn();
const mockDeleteDraftOp = jest.fn();
const mockDeleteScheduledMessageOp = jest.fn();
const mockUpdateScheduledMessageOp = jest.fn();

jest.mock("@openslaq/client-core", () => ({
  fetchDrafts: (...args: unknown[]) => mockFetchDrafts(...args),
  fetchScheduledMessages: (...args: unknown[]) => mockFetchScheduledMessages(...args),
  deleteDraftOp: (...args: unknown[]) => mockDeleteDraftOp(...args),
  deleteScheduledMessageOp: (...args: unknown[]) => mockDeleteScheduledMessageOp(...args),
  updateScheduledMessageOp: (...args: unknown[]) => mockUpdateScheduledMessageOp(...args),
}));

jest.mock("lucide-react-native", () => {
  const { View } = require("react-native");
  return {
    Send: (props: Record<string, unknown>) => <View {...props} />,
    Clock: (props: Record<string, unknown>) => <View {...props} />,
    FileEdit: (props: Record<string, unknown>) => <View {...props} />,
    ArrowRight: (props: Record<string, unknown>) => <View {...props} />,
  };
});

import { OutboxScreen } from "../OutboxScreen";

const mockDrafts = [
  {
    id: "draft-1",
    channelId: "ch-1",
    userId: "user-1",
    content: "Hello draft content",
    parentMessageId: null,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    channelName: "general",
  },
  {
    id: "draft-2",
    channelId: "ch-2",
    userId: "user-1",
    content: "Thread draft",
    parentMessageId: "msg-1",
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    channelName: "random",
  },
];

const mockScheduled = [
  {
    id: "sched-1",
    channelId: "ch-1",
    userId: "user-1",
    content: "Pending message",
    scheduledFor: new Date(Date.now() + 3600000).toISOString(),
    status: "pending",
    channelName: "general",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attachmentIds: [],
    failureReason: null,
    sentMessageId: null,
  },
  {
    id: "sched-2",
    channelId: "ch-1",
    userId: "user-1",
    content: "Failed message",
    scheduledFor: new Date(Date.now() - 3600000).toISOString(),
    status: "failed",
    channelName: "general",
    failureReason: "Channel archived",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attachmentIds: [],
    sentMessageId: null,
  },
  {
    id: "sched-3",
    channelId: "ch-2",
    userId: "user-1",
    content: "Sent message",
    scheduledFor: new Date(Date.now() - 7200000).toISOString(),
    status: "sent",
    channelName: "random",
    sentMessageId: "msg-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attachmentIds: [],
    failureReason: null,
  },
];

async function renderAndWaitForLoad() {
  render(<OutboxScreen />);
  await screen.findByTestId("outbox-screen");
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchDrafts.mockResolvedValue(mockDrafts);
  mockFetchScheduledMessages.mockResolvedValue(mockScheduled);
});

describe("OutboxScreen", () => {
  it("renders loading state initially", () => {
    mockFetchDrafts.mockReturnValue(new Promise(() => {}));
    mockFetchScheduledMessages.mockReturnValue(new Promise(() => {}));
    render(<OutboxScreen />);
    expect(screen.getByTestId("outbox-loading")).toBeTruthy();
  });

  it("renders tabs after loading", async () => {
    await renderAndWaitForLoad();
    expect(screen.getByTestId("outbox-tab-drafts")).toBeTruthy();
    expect(screen.getByTestId("outbox-tab-scheduled")).toBeTruthy();
    expect(screen.getByTestId("outbox-tab-sent")).toBeTruthy();
  });

  it("renders drafts tab by default", async () => {
    await renderAndWaitForLoad();
    expect(screen.getByTestId("outbox-drafts-list")).toBeTruthy();
    expect(screen.getByTestId("draft-item-draft-1")).toBeTruthy();
    expect(screen.getByTestId("draft-item-draft-2")).toBeTruthy();
    expect(screen.getByText("Hello draft content")).toBeTruthy();
  });

  it("switches to scheduled tab", async () => {
    await renderAndWaitForLoad();
    fireEvent.press(screen.getByTestId("outbox-tab-scheduled"));
    expect(screen.getByTestId("outbox-scheduled-list")).toBeTruthy();
    expect(screen.getByTestId("scheduled-item-sched-1")).toBeTruthy();
    expect(screen.getByTestId("scheduled-item-sched-2")).toBeTruthy();
    expect(screen.getByText("Pending message")).toBeTruthy();
    expect(screen.getByText("Channel archived")).toBeTruthy();
  });

  it("switches to sent tab", async () => {
    await renderAndWaitForLoad();
    fireEvent.press(screen.getByTestId("outbox-tab-sent"));
    expect(screen.getByTestId("outbox-sent-list")).toBeTruthy();
    expect(screen.getByTestId("sent-item-sched-3")).toBeTruthy();
    expect(screen.getByText("Sent message")).toBeTruthy();
    expect(screen.getByText("View message")).toBeTruthy();
  });

  it("shows empty state for drafts when empty", async () => {
    mockFetchDrafts.mockResolvedValue([]);
    render(<OutboxScreen />);
    await screen.findByTestId("outbox-drafts-empty");
    expect(screen.getByText("No drafts")).toBeTruthy();
  });

  it("shows error state", async () => {
    mockFetchDrafts.mockRejectedValue(new Error("Network error"));
    render(<OutboxScreen />);
    await screen.findByTestId("outbox-error");
    expect(screen.getByText("Network error")).toBeTruthy();
  });

  it("shows status badges for scheduled items", async () => {
    await renderAndWaitForLoad();
    fireEvent.press(screen.getByTestId("outbox-tab-scheduled"));
    expect(screen.getByTestId("scheduled-status-sched-1")).toBeTruthy();
    expect(screen.getByText("PENDING")).toBeTruthy();
    expect(screen.getByText("FAILED")).toBeTruthy();
  });

  it("navigates to channel when draft is pressed", async () => {
    await renderAndWaitForLoad();
    fireEvent.press(screen.getByTestId("draft-item-draft-1"));
    expect(mockPush).toHaveBeenCalledWith("/(app)/acme/(tabs)/(channels)/ch-1");
  });

  it("navigates to thread when thread draft is pressed", async () => {
    await renderAndWaitForLoad();
    fireEvent.press(screen.getByTestId("draft-item-draft-2"));
    expect(mockPush).toHaveBeenCalledWith("/(app)/acme/thread/msg-1");
  });

  it("navigates to channel when sent item is pressed", async () => {
    await renderAndWaitForLoad();
    fireEvent.press(screen.getByTestId("outbox-tab-sent"));
    fireEvent.press(screen.getByTestId("sent-item-sched-3"));
    expect(mockPush).toHaveBeenCalledWith("/(app)/acme/(tabs)/(channels)/ch-2");
  });

  it("shows delete confirmation for draft", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    await renderAndWaitForLoad();
    fireEvent.press(screen.getByTestId("draft-delete-draft-1"));
    expect(alertSpy).toHaveBeenCalledWith(
      "Delete Draft",
      "Are you sure?",
      expect.any(Array),
    );
  });

  it("shows reschedule and delete buttons for pending items", async () => {
    await renderAndWaitForLoad();
    fireEvent.press(screen.getByTestId("outbox-tab-scheduled"));
    expect(screen.getByTestId("scheduled-reschedule-sched-1")).toBeTruthy();
    expect(screen.getByTestId("scheduled-delete-sched-1")).toBeTruthy();
  });

  it("shows retry button on error and retries on press", async () => {
    mockFetchDrafts.mockRejectedValue(new Error("Network error"));
    render(<OutboxScreen />);
    await screen.findByTestId("outbox-error");
    expect(screen.getByTestId("outbox-retry")).toBeTruthy();

    mockFetchDrafts.mockResolvedValue([]);
    mockFetchScheduledMessages.mockResolvedValue([]);
    fireEvent.press(screen.getByTestId("outbox-retry"));

    expect(mockFetchDrafts).toHaveBeenCalledTimes(2);
  });

  it("shows 'Resume' label on draft cards instead of 'Edit'", async () => {
    await renderAndWaitForLoad();
    expect(screen.getAllByText("Resume")).toHaveLength(mockDrafts.length);
    expect(screen.queryByText("Edit")).toBeNull();
  });
});
