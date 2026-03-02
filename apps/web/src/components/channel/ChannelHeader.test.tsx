import { describe, test, expect, afterEach, jest, mock } from "bun:test";
import { render, screen, cleanup } from "../../test-utils";
import { fireEvent } from "@testing-library/react";
import { TooltipProvider } from "../ui";

mock.module("./ChannelMembersDialog", () => ({
  ChannelMembersDialog: () => null,
}));
mock.module("../huddle/HuddleHeaderButton", () => ({
  HuddleHeaderButton: () => null,
}));

const { ChannelHeader } = await import("./ChannelHeader");

function renderHeader(props: Parameters<typeof ChannelHeader>[0]) {
  return render(
    <TooltipProvider>
      <ChannelHeader {...props} />
    </TooltipProvider>,
  );
}

describe("ChannelHeader", () => {
  afterEach(cleanup);

  // ── Basic rendering ──────────────────────────────────────────────

  test("renders # prefix for public channel", () => {
    renderHeader({ channelName: "general" });
    expect(screen.queryByTestId("private-channel-icon")).toBeNull();
    expect(screen.getByText("#")).toBeTruthy();
  });

  test("renders lock icon for private channel", () => {
    renderHeader({ channelName: "secret", channelType: "private" });
    expect(screen.getByTestId("private-channel-icon")).toBeTruthy();
  });

  test("renders archived badge when isArchived=true", () => {
    renderHeader({ channelName: "old-stuff", isArchived: true });
    expect(screen.getByTestId("archived-badge")).toBeTruthy();
    expect(screen.getByTestId("archived-badge").textContent).toBe("Archived");
  });

  test("does not render archived badge when isArchived=false", () => {
    renderHeader({ channelName: "active", isArchived: false });
    expect(screen.queryByTestId("archived-badge")).toBeNull();
  });

  test('falls back to "Channel" when channelName is null', () => {
    renderHeader({ channelName: null });
    expect(screen.getByText("Channel")).toBeTruthy();
  });

  // ── Star button ──────────────────────────────────────────────────

  test("renders star button when onToggleStar provided", () => {
    renderHeader({ channelName: "general", onToggleStar: jest.fn() });
    expect(screen.getByTestId("star-channel-button")).toBeTruthy();
  });

  test("does NOT render star button when onToggleStar omitted", () => {
    renderHeader({ channelName: "general" });
    expect(screen.queryByTestId("star-channel-button")).toBeNull();
  });

  test("calls onToggleStar on click", () => {
    const onToggleStar = jest.fn();
    renderHeader({ channelName: "general", onToggleStar });
    fireEvent.click(screen.getByTestId("star-channel-button"));
    expect(onToggleStar).toHaveBeenCalledTimes(1);
  });

  test('shows "Unstar channel" aria-label when isStarred=true', () => {
    renderHeader({ channelName: "general", onToggleStar: jest.fn(), isStarred: true });
    expect(screen.getByLabelText("Unstar channel")).toBeTruthy();
  });

  test('shows "Star channel" aria-label when isStarred=false', () => {
    renderHeader({ channelName: "general", onToggleStar: jest.fn(), isStarred: false });
    expect(screen.getByLabelText("Star channel")).toBeTruthy();
  });

  // ── Topic editing ────────────────────────────────────────────────

  test("shows topic text when description provided", () => {
    renderHeader({ channelName: "general", onUpdateDescription: jest.fn(), description: "Our main channel" });
    expect(screen.getByTestId("channel-topic-text")).toBeTruthy();
    expect(screen.getByTestId("channel-topic-text").textContent).toBe("Our main channel");
  });

  test("shows placeholder when no description", () => {
    renderHeader({ channelName: "general", onUpdateDescription: jest.fn() });
    expect(screen.getByTestId("channel-topic-placeholder")).toBeTruthy();
    expect(screen.getByTestId("channel-topic-placeholder").textContent).toBe("Add a topic");
  });

  test("saves topic on blur instead of discarding", () => {
    const onUpdateDescription = jest.fn();
    renderHeader({ channelName: "general", onUpdateDescription });

    fireEvent.click(screen.getByTestId("channel-topic-button"));
    const input = screen.getByTestId("channel-topic-input");
    fireEvent.change(input, { target: { value: "New topic" } });
    fireEvent.blur(input);

    expect(onUpdateDescription).toHaveBeenCalledWith("New topic");
  });

  test("pressing Enter saves topic", () => {
    const onUpdateDescription = jest.fn();
    renderHeader({ channelName: "general", onUpdateDescription });

    fireEvent.click(screen.getByTestId("channel-topic-button"));
    const input = screen.getByTestId("channel-topic-input");
    fireEvent.change(input, { target: { value: "Enter topic" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onUpdateDescription).toHaveBeenCalledWith("Enter topic");
  });

  test("pressing Escape cancels editing without saving", () => {
    const onUpdateDescription = jest.fn();
    renderHeader({ channelName: "general", onUpdateDescription, description: "Original" });

    fireEvent.click(screen.getByTestId("channel-topic-button"));
    const input = screen.getByTestId("channel-topic-input");
    fireEvent.change(input, { target: { value: "Changed" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(onUpdateDescription).not.toHaveBeenCalled();
    // Should return to view mode
    expect(screen.getByTestId("channel-topic-text")).toBeTruthy();
  });

  test("does not call onUpdateDescription when topic is unchanged", () => {
    const onUpdateDescription = jest.fn();
    renderHeader({ channelName: "general", onUpdateDescription, description: "Same topic" });

    fireEvent.click(screen.getByTestId("channel-topic-button"));
    const input = screen.getByTestId("channel-topic-input");
    // Don't change value — just blur
    fireEvent.blur(input);

    expect(onUpdateDescription).not.toHaveBeenCalled();
  });

  // ── Notification dropdown ────────────────────────────────────────

  test("renders notification button when onSetNotificationLevel provided", () => {
    renderHeader({ channelName: "general", onSetNotificationLevel: jest.fn() });
    expect(screen.getByTestId("channel-notification-button")).toBeTruthy();
  });

  test("does NOT render notification button when onSetNotificationLevel omitted", () => {
    renderHeader({ channelName: "general" });
    expect(screen.queryByTestId("channel-notification-button")).toBeNull();
  });

  test("shows muted icon when notificationLevel is muted", () => {
    renderHeader({ channelName: "general", onSetNotificationLevel: jest.fn(), notificationLevel: "muted" });
    const btn = screen.getByTestId("channel-notification-button");
    // Muted icon has a specific path with "M3 3l18 18" (the slash-through)
    expect(btn.innerHTML).toContain("M3 3l18 18");
  });

  test("shows normal bell icon when notificationLevel is not muted", () => {
    renderHeader({ channelName: "general", onSetNotificationLevel: jest.fn(), notificationLevel: "all" });
    const btn = screen.getByTestId("channel-notification-button");
    // Normal bell icon does NOT have the muted slash-through
    expect(btn.innerHTML).not.toContain("M3 3l18 18");
  });

  // ── Pinned messages ──────────────────────────────────────────────

  test("renders pin button when onOpenPins provided", () => {
    renderHeader({ channelName: "general", onOpenPins: jest.fn() });
    expect(screen.getByTestId("pinned-messages-button")).toBeTruthy();
  });

  test("shows pinned count when pinnedCount > 0", () => {
    renderHeader({ channelName: "general", onOpenPins: jest.fn(), pinnedCount: 5 });
    expect(screen.getByTestId("pinned-count")).toBeTruthy();
    expect(screen.getByTestId("pinned-count").textContent).toBe("5");
  });

  test("does NOT show pinned count when pinnedCount=0", () => {
    renderHeader({ channelName: "general", onOpenPins: jest.fn(), pinnedCount: 0 });
    expect(screen.queryByTestId("pinned-count")).toBeNull();
  });

  test("calls onOpenPins on click", () => {
    const onOpenPins = jest.fn();
    renderHeader({ channelName: "general", onOpenPins });
    fireEvent.click(screen.getByTestId("pinned-messages-button"));
    expect(onOpenPins).toHaveBeenCalledTimes(1);
  });

  // ── Files button ─────────────────────────────────────────────────

  test("renders files button when onOpenFiles provided", () => {
    renderHeader({ channelName: "general", onOpenFiles: jest.fn() });
    expect(screen.getByTestId("channel-files-button")).toBeTruthy();
  });

  test("does NOT render files button when onOpenFiles omitted", () => {
    renderHeader({ channelName: "general" });
    expect(screen.queryByTestId("channel-files-button")).toBeNull();
  });

  test("calls onOpenFiles on click", () => {
    const onOpenFiles = jest.fn();
    renderHeader({ channelName: "general", onOpenFiles });
    fireEvent.click(screen.getByTestId("channel-files-button"));
    expect(onOpenFiles).toHaveBeenCalledTimes(1);
  });

  // ── Member count ─────────────────────────────────────────────────

  test("renders member count when channelId and memberCount provided", () => {
    renderHeader({ channelName: "general", channelId: "ch-1", memberCount: 12 });
    expect(screen.getByTestId("channel-member-count")).toBeTruthy();
    expect(screen.getByTestId("channel-member-count").textContent).toContain("12");
  });

  test("does NOT render member count when channelId is missing", () => {
    renderHeader({ channelName: "general", memberCount: 12 });
    expect(screen.queryByTestId("channel-member-count")).toBeNull();
  });

  test("does NOT render member count when memberCount is missing", () => {
    renderHeader({ channelName: "general", channelId: "ch-1" });
    expect(screen.queryByTestId("channel-member-count")).toBeNull();
  });

  // ── Archive / Unarchive ──────────────────────────────────────────

  test("renders archive button when canArchive && !isArchived && onArchive", () => {
    renderHeader({ channelName: "random", canArchive: true, isArchived: false, onArchive: jest.fn() });
    expect(screen.getByTestId("archive-channel-button")).toBeTruthy();
  });

  test("does NOT render archive button for general channel", () => {
    renderHeader({ channelName: "general", canArchive: true, isArchived: false, onArchive: jest.fn() });
    expect(screen.queryByTestId("archive-channel-button")).toBeNull();
  });

  test("confirm-archive-button calls onArchive", () => {
    const onArchive = jest.fn();
    renderHeader({ channelName: "random", canArchive: true, isArchived: false, onArchive });

    // Open confirmation dialog
    fireEvent.click(screen.getByTestId("archive-channel-button"));
    // Confirm
    fireEvent.click(screen.getByTestId("confirm-archive-button"));
    expect(onArchive).toHaveBeenCalledTimes(1);
  });

  test("cancel button closes dialog without calling onArchive", () => {
    const onArchive = jest.fn();
    renderHeader({ channelName: "random", canArchive: true, isArchived: false, onArchive });

    fireEvent.click(screen.getByTestId("archive-channel-button"));
    // Click Cancel
    fireEvent.click(screen.getByText("Cancel"));
    expect(onArchive).not.toHaveBeenCalled();
  });

  test("renders unarchive button when canArchive && isArchived && onUnarchive", () => {
    renderHeader({ channelName: "old-stuff", canArchive: true, isArchived: true, onUnarchive: jest.fn() });
    expect(screen.getByTestId("unarchive-channel-button")).toBeTruthy();
  });

  test("calls onUnarchive on click", () => {
    const onUnarchive = jest.fn();
    renderHeader({ channelName: "old-stuff", canArchive: true, isArchived: true, onUnarchive });

    fireEvent.click(screen.getByTestId("unarchive-channel-button"));
    expect(onUnarchive).toHaveBeenCalledTimes(1);
  });

  test("does NOT render archive button when canArchive is false", () => {
    renderHeader({ channelName: "random", canArchive: false, isArchived: false, onArchive: jest.fn() });
    expect(screen.queryByTestId("archive-channel-button")).toBeNull();
  });
});
