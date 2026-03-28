import { expect } from "@playwright/test";
import { sharedTest as test, addMemberViaInvite } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";
import { SECOND_USER } from "./helpers/api";

test.describe("All Unreads view", () => {
  test("sidebar shows All Unreads link", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await expect(page.getByTestId("unreads-view-link")).toBeVisible();
    await expect(page.getByTestId("unreads-view-link")).toContainText("All Unreads");
  });

  test("clicking All Unreads shows unreads view", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    // Wait for bootstrap to finish before clicking
    await expect(page.getByTestId("channels-section-header")).toBeVisible();

    // Mark all channels as read first
    const channels = await testWorkspace.api.getChannels();
    for (const ch of channels) {
      await testWorkspace.api.markChannelAsRead(ch.id);
    }

    await page.getByTestId("unreads-view-link").click();
    await expect(page.getByTestId("all-unreads-view")).toBeVisible();
    await expect(page.getByTestId("unreads-empty-state")).toBeVisible();
    await expect(page.getByTestId("unreads-empty-state")).toContainText("all caught up");
  });

  test("shows unread messages and mark-all-read clears them", async ({ page, testWorkspace }) => {
    const secondApi = await addMemberViaInvite(testWorkspace.api, SECOND_USER, testWorkspace.slug);
    // Use #random (not #general) so bootstrap's auto-select of #general won't mark it as read
    const random = await testWorkspace.api.getChannelByName("random");
    await secondApi.joinChannel(random.id);

    // Mark as read, then have second user send messages
    await testWorkspace.api.markChannelAsRead(random.id);
    await secondApi.createMessage(random.id, "Unread for all-unreads test");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    // Wait for bootstrap to finish before clicking
    await expect(page.getByTestId("channels-section-header")).toBeVisible();

    await page.getByTestId("unreads-view-link").click();
    await expect(page.getByTestId("all-unreads-view")).toBeVisible();
    await expect(page.getByText("Unread for all-unreads test")).toBeVisible({ timeout: 5000 });

    // Mark all as read
    await page.getByTestId("mark-all-read-btn").click();
    await expect(page.getByTestId("unreads-empty-state")).toBeVisible({ timeout: 5000 });
  });

  test("clicking a message navigates to the channel", async ({ page, testWorkspace }) => {
    const secondApi = await addMemberViaInvite(testWorkspace.api, SECOND_USER, testWorkspace.slug);
    // Use #random (not #general) so bootstrap's auto-select of #general won't mark it as read
    const random = await testWorkspace.api.getChannelByName("random");
    await secondApi.joinChannel(random.id);

    await testWorkspace.api.markChannelAsRead(random.id);
    await secondApi.createMessage(random.id, "Click me to go to channel");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    // Wait for bootstrap to finish before clicking
    await expect(page.getByTestId("channels-section-header")).toBeVisible();

    await page.getByTestId("unreads-view-link").click();
    await expect(page.getByText("Click me to go to channel")).toBeVisible({ timeout: 5000 });

    // Click the message
    await page.getByText("Click me to go to channel").click();

    // Should navigate to the channel
    await expect(page).toHaveURL(new RegExp(`/w/${testWorkspace.slug}/c/${random.id}`), { timeout: 5000 });
  });
});
