import { describe, expect, test, afterEach, jest, beforeEach, mock } from "bun:test";
import { render, screen, cleanup, act } from "../../test-utils";
import { fireEvent } from "@testing-library/react";
import type { DraftItem, ScheduledMessageItem } from "@openslaq/client-core";

// Mock drafts hook
const mockDraftsReturn = {
  data: null as DraftItem[] | null,
  loading: false,
  error: null as string | null,
  refresh: jest.fn(),
  removeItem: jest.fn(),
};

mock.module("../../hooks/chat/useDrafts", () => ({
  useDrafts: () => mockDraftsReturn,
}));

// Mock scheduled messages hook
const mockScheduledReturn = {
  data: null as ScheduledMessageItem[] | null,
  loading: false,
  error: null as string | null,
  refresh: jest.fn(),
  removeItem: jest.fn(),
  updateItem: jest.fn(),
};

mock.module("../../hooks/chat/useScheduledMessages", () => ({
  useScheduledMessages: () => mockScheduledReturn,
}));

// Mock api-client
const _realApiClient = require("../../lib/api-client");
mock.module("../../lib/api-client", () => ({
  ..._realApiClient,
  useAuthProvider: () => ({ getToken: async () => "test-token" }),
}));

mock.module("../../api", () => ({
  api: {},
}));

mock.module("../../state/chat-store", () => ({
  useChatStore: () => ({
    state: { activeView: "outbox" },
    dispatch: jest.fn(),
  }),
}));

// Mock the ScheduledTab and SentTab to avoid deep dependency issues
mock.module("./ScheduledTab", () => ({
  ScheduledTab: () => <div data-testid="scheduled-tab-content">No scheduled messages</div>,
}));

mock.module("./SentTab", () => ({
  SentTab: () => <div data-testid="sent-tab-content">No sent messages</div>,
}));

const { OutboxView } = await import("./OutboxView");

const noop = () => {};

describe("OutboxView", () => {
  beforeEach(() => {
    mockDraftsReturn.data = null;
    mockDraftsReturn.loading = false;
    mockDraftsReturn.error = null;
    mockScheduledReturn.data = null;
    mockScheduledReturn.loading = false;
    mockScheduledReturn.error = null;
  });

  afterEach(cleanup);

  test("renders with three tabs, defaults to Drafts", () => {
    mockDraftsReturn.data = [];
    render(<OutboxView workspaceSlug="test" onNavigateToChannel={noop} />);

    expect(screen.getByTestId("outbox-view")).toBeTruthy();
    expect(screen.getByTestId("outbox-tab-drafts")).toBeTruthy();
    expect(screen.getByTestId("outbox-tab-scheduled")).toBeTruthy();
    expect(screen.getByTestId("outbox-tab-sent")).toBeTruthy();

    // Drafts tab is active by default, showing drafts empty state
    expect(screen.getByText("No drafts")).toBeTruthy();
  });

  test("switching to Scheduled tab", async () => {
    mockDraftsReturn.data = [];
    mockScheduledReturn.data = [];
    render(<OutboxView workspaceSlug="test" onNavigateToChannel={noop} />);

    act(() => {
      fireEvent.click(screen.getByTestId("outbox-tab-scheduled"));
    });
    expect(screen.getByText("No scheduled messages")).toBeTruthy();
  });

  test("switching to Sent tab", async () => {
    mockDraftsReturn.data = [];
    mockScheduledReturn.data = [];
    render(<OutboxView workspaceSlug="test" onNavigateToChannel={noop} />);

    act(() => {
      fireEvent.click(screen.getByTestId("outbox-tab-sent"));
    });
    expect(screen.getByText("No sent messages")).toBeTruthy();
  });

  test("Drafts tab shows drafts list", () => {
    mockDraftsReturn.data = [
      {
        id: "d1",
        channelId: "ch-1",
        userId: "u-1",
        content: "My draft content",
        parentMessageId: null,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        channelName: "general",
      },
    ];
    render(<OutboxView workspaceSlug="test" onNavigateToChannel={noop} />);

    expect(screen.getByText("My draft content")).toBeTruthy();
    expect(screen.getByText("#general")).toBeTruthy();
  });

  test("Drafts tab shows loading state", () => {
    mockDraftsReturn.loading = true;
    render(<OutboxView workspaceSlug="test" onNavigateToChannel={noop} />);

    expect(screen.getByText("Loading drafts...")).toBeTruthy();
  });

  test("Drafts tab shows error state", () => {
    mockDraftsReturn.error = "Network error";
    render(<OutboxView workspaceSlug="test" onNavigateToChannel={noop} />);

    expect(screen.getByText("Network error")).toBeTruthy();
  });
});
