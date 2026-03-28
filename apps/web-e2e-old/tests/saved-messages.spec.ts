import { expect } from "@playwright/test";
import { test } from "./helpers/test-workspace";
import { openWorkspaceChannel, sendMessageAndWait } from "./helpers/chat-ui";

test.describe("Saved messages", () => {
  test("save from message action menu → save action visible", async ({ page, testWorkspace }) => {
    await openWorkspaceChannel(page, testWorkspace.slug);

    // Send a message
    await sendMessageAndWait(page, "Save me please");

    // Wait for message to appear
    await expect(page.getByText("Save me please")).toBeVisible();

    // Hover over message to show action bar
    await page.getByText("Save me please").hover();

    // Open overflow menu
    await page.getByTestId("message-overflow-menu").click();

    // Click "Save for later"
    await page.getByTestId("save-message-action").click();

    // Hover again to verify "Remove from saved" now appears
    await page.getByText("Save me please").hover();
    await page.getByTestId("message-overflow-menu").click();
    await expect(page.getByTestId("unsave-message-action")).toBeVisible();
  });

  test("sidebar shows Saved Items link", async ({ page, testWorkspace }) => {
    await openWorkspaceChannel(page, testWorkspace.slug);

    // Saved Items link should be in sidebar
    await expect(page.getByTestId("saved-view-link")).toBeVisible();
    await expect(page.getByTestId("saved-view-link")).toContainText("Saved Items");
  });

  test("navigate to saved view → shows saved messages", async ({ page, testWorkspace }) => {
    await openWorkspaceChannel(page, testWorkspace.slug);

    // Send and save a message
    await sendMessageAndWait(page, "Saved for view test");
    await expect(page.getByText("Saved for view test")).toBeVisible();

    // Save the message
    await page.getByText("Saved for view test").hover();
    await page.getByTestId("message-overflow-menu").click();
    await page.getByTestId("save-message-action").click();

    // Navigate to Saved Items via sidebar
    await page.getByTestId("saved-view-link").click();

    // Saved view should appear
    await expect(page.getByTestId("saved-items-view")).toBeVisible();

    // The saved message should be visible
    await expect(page.getByTestId("saved-items-view")).toContainText("Saved for view test");
  });

  test("unsave removes message from saved view", async ({ page, testWorkspace }) => {
    await openWorkspaceChannel(page, testWorkspace.slug);

    // Send and save a message
    await sendMessageAndWait(page, "Unsave from view test");
    await expect(page.getByText("Unsave from view test")).toBeVisible();

    // Save the message
    await page.getByText("Unsave from view test").hover();
    await page.getByTestId("message-overflow-menu").click();
    await page.getByTestId("save-message-action").click();

    // Navigate to Saved Items
    await page.getByTestId("saved-view-link").click();
    await expect(page.getByTestId("saved-items-view")).toBeVisible();
    await expect(page.getByTestId("saved-items-view")).toContainText("Unsave from view test");

    // Click the Remove button to unsave
    const savedMessage = page.locator("[data-testid^='unsave-']").first();
    await savedMessage.click();

    // After removal, the empty state should appear
    await expect(page.getByTestId("saved-empty-state")).toBeVisible();
  });
});
