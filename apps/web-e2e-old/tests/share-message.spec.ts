import { expect } from "@playwright/test";
import { test } from "./helpers/test-workspace";
import { openWorkspaceChannel, sendMessageAndWait } from "./helpers/chat-ui";

test.describe("Share message", () => {
  test("share from action menu → shared block appears in destination", async ({ page, testWorkspace }) => {
    await openWorkspaceChannel(page, testWorkspace.slug);

    // Send a message in #general
    await sendMessageAndWait(page, "Share me to random");

    // Hover over message to show action bar
    await page.getByText("Share me to random").hover();

    // Open overflow menu
    await page.getByTestId("message-overflow-menu").click();

    // Click "Share message"
    await page.getByTestId("share-message-action").click();

    // Dialog should be visible
    await expect(page.getByText("Share message")).toBeVisible();

    // Select #random channel
    const randomChannelButton = page.locator("[data-testid^='share-channel-']", { hasText: "#random" });
    await randomChannelButton.click();

    // Click share button
    await page.getByTestId("share-confirm-button").click();

    // Navigate to #random
    await page.getByText("# random").click();
    await page.locator(".tiptap").waitFor();

    // Shared message block should appear
    await expect(page.getByTestId("shared-message-block")).toBeVisible();
    await expect(page.getByTestId("shared-message-block")).toContainText("Share me to random");
  });

  test("shared block shows source channel name and sender", async ({ page, testWorkspace }) => {
    // Pre-create a shared message via API
    const generalChannel = await testWorkspace.api.getChannelByName("general");
    const randomChannel = await testWorkspace.api.getChannelByName("random");
    const msg = await testWorkspace.api.createMessage(generalChannel.id, "Shared block content test");

    // Share via API
    await testWorkspace.api.shareMessage(randomChannel.id, msg.id, "Look at this!");

    await openWorkspaceChannel(page, testWorkspace.slug, "random");

    // Shared block should show source channel name
    await expect(page.getByTestId("shared-message-block")).toBeVisible();
    await expect(page.getByTestId("shared-message-block")).toContainText("general");
    await expect(page.getByTestId("shared-message-block")).toContainText("Shared block content test");
  });
});
