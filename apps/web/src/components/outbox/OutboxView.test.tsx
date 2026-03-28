import { describe, expect, test, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, act } from "../../test-utils";
import { fireEvent } from "@testing-library/react";
import type { DraftItem } from "@openslaq/client-core";

// Mock drafts hook
const mockDraftsReturn = {
  data: null as DraftItem[] | null,
  loading: false,
  error: null as string | null,
  refresh: vi.fn(),
  removeItem: vi.fn(),
};

vi.mock("../../hooks/chat/useDrafts", () => ({
  useDrafts: () => mockDraftsReturn,
}));

// Mock api-client
vi.mock("../../lib/api-client", async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return {
    ...mod,
  useAuthProvider: () => ({ getToken: async () => "test-token" }),
  };
});

vi.mock("../../api", () => ({
  api: {},
}));

vi.mock("../../state/chat-store", () => ({
  useChatStore: () => ({
    state: { activeView: "outbox" },
    dispatch: vi.fn(),
  }),
}));

// Mock the ScheduledTab and SentTab to avoid deep dependency issues
vi.mock("./ScheduledTab", () => ({
  ScheduledTab: () => <div data-testid="scheduled-tab-content">No scheduled messages</div>,
}));

vi.mock("./SentTab", () => ({
  SentTab: () => <div data-testid="sent-tab-content">No sent messages</div>,
}));

import { OutboxView } from "./OutboxView";

const noop = () => {};

describe("OutboxView", () => {
  beforeEach(() => {
    mockDraftsReturn.data = null;
    mockDraftsReturn.loading = false;
    mockDraftsReturn.error = null;
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
    render(<OutboxView workspaceSlug="test" onNavigateToChannel={noop} />);

    act(() => {
      fireEvent.click(screen.getByTestId("outbox-tab-scheduled"));
    });
    expect(screen.getByText("No scheduled messages")).toBeTruthy();
  });

  test("switching to Sent tab", async () => {
    mockDraftsReturn.data = [];
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
