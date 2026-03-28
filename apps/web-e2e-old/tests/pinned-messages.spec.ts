import { expect } from "@playwright/test";
import { test } from "./helpers/test-workspace";
import { openWorkspaceChannel, sendMessageAndWait } from "./helpers/chat-ui";

test.describe("Pinned messages", () => {
  test("pin from message action menu → pin badge appears", async ({ page, testWorkspace }) => {
    await openWorkspaceChannel(page, testWorkspace.slug);

    // Send a message
    await sendMessageAndWait(page, "Pin me please");

    // Wait for message to appear
    await expect(page.getByText("Pin me please")).toBeVisible();

    // Hover over message to show action bar
    await page.getByText("Pin me please").hover();

    // Open overflow menu
    await page.getByTestId("message-overflow-menu").click();

    // Click "Pin message"
    await page.getByTestId("pin-message-action").click();

    // Pin badge should appear on the message
    await expect(page.getByTestId("pin-badge")).toBeVisible();
  });

  test("header shows pin count", async ({ page, testWorkspace }) => {
    // Pre-create a message and pin it via API
    const channel = await testWorkspace.api.getChannelByName("general");
    const msg = await testWorkspace.api.createMessage(channel.id, "Already pinned message");
    await testWorkspace.api.pinMessage(channel.id, msg.id);

    await openWorkspaceChannel(page, testWorkspace.slug);

    // Pinned count should show in header (loads asynchronously)
    await expect(page.getByTestId("pinned-messages-button")).toBeVisible();
    await expect(page.getByTestId("pinned-count")).toContainText("1", { timeout: 15_000 });
  });

  test("open popover → shows pinned message", async ({ page, testWorkspace }) => {
    // Pre-create and pin a message
    const channel = await testWorkspace.api.getChannelByName("general");
    const msg = await testWorkspace.api.createMessage(channel.id, "Pinned for popover test");
    await testWorkspace.api.pinMessage(channel.id, msg.id);

    await openWorkspaceChannel(page, testWorkspace.slug);

    // Click pinned messages button in header
    await page.getByTestId("pinned-messages-button").click();

    // Popover should appear with the pinned message
    await expect(page.getByTestId("pinned-messages-popover")).toBeVisible();
    await expect(page.getByTestId("pinned-messages-popover")).toContainText("Pinned for popover test");
  });

  test("unpin → badge removed, popover empty", async ({ page, testWorkspace }) => {
    await openWorkspaceChannel(page, testWorkspace.slug);

    // Send and pin a message
    await sendMessageAndWait(page, "Unpin test message");
    await expect(page.getByText("Unpin test message")).toBeVisible();

    // Pin the message
    await page.getByText("Unpin test message").hover();
    await page.getByTestId("message-overflow-menu").click();
    await page.getByTestId("pin-message-action").click();
    await expect(page.getByTestId("pin-badge")).toBeVisible();

    // Unpin the message
    await page.getByText("Unpin test message").hover();
    await page.getByTestId("message-overflow-menu").click();
    await page.getByTestId("unpin-message-action").click();

    // Pin badge should be gone
    await expect(page.getByTestId("pin-badge")).not.toBeVisible();
  });
});
