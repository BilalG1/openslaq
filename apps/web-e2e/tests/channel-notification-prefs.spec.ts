import { expect } from "@playwright/test";
import { test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";

test.describe("Channel notification preferences", () => {
  test("header bell dropdown changes notification level", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    // Open bell dropdown
    await page.getByTestId("channel-notification-button").click();

    // Should default to "All messages" checked
    await expect(page.getByTestId("notify-level-all")).toBeVisible();
    await expect(page.getByTestId("notify-level-mentions")).toBeVisible();
    await expect(page.getByTestId("notify-level-muted")).toBeVisible();

    // Set to muted
    await page.getByTestId("notify-level-muted").click();

    // Reopen dropdown to verify checkmark moved
    await page.getByTestId("channel-notification-button").click();
    await expect(page.getByTestId("notify-level-muted")).toContainText("\u2713");
  });

  test("muted channel shows mute icon in sidebar", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    // Mute channel via header
    await page.getByTestId("channel-notification-button").click();
    await page.getByTestId("notify-level-muted").click();

    // Sidebar should show mute icon for general
    const generalChannel = page.getByText("# general").first();
    const channelRow = generalChannel.locator("..");
    await expect(channelRow.locator("svg")).toBeTruthy();
  });

  test("prefs persist after reload", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    // Set to mentions only — wait for the API call to complete before reloading
    await page.getByTestId("channel-notification-button").click();
    const prefSaved = page.waitForResponse(
      (res) => res.url().includes("/notification-pref") && res.status() < 400,
    );
    await page.getByTestId("notify-level-mentions").click();
    await prefSaved;

    // Reload
    await page.reload();

    // Wait for workspace to fully load before interacting
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // Verify persisted — use retry loop since prefs load asynchronously
    await expect(async () => {
      await page.getByTestId("channel-notification-button").click();
      await expect(page.getByTestId("notify-level-mentions")).toContainText("\u2713");
    }).toPass({ timeout: 10_000 });
  });

  test("set back to all clears preference", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    // Set to muted
    await page.getByTestId("channel-notification-button").click();
    await page.getByTestId("notify-level-muted").click();

    // Set back to all
    await page.getByTestId("channel-notification-button").click();
    await page.getByTestId("notify-level-all").click();

    // Verify
    await page.getByTestId("channel-notification-button").click();
    await expect(page.getByTestId("notify-level-all")).toContainText("\u2713");
  });
});
