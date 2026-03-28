import { expect } from "@playwright/test";
import { test, addMemberViaInvite } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";
import { SECOND_USER } from "./helpers/api";

test.describe("Mark as unread", () => {
  test("overflow menu shows 'Mark as unread' and clicking it shows sidebar badge", async ({
    page,
    testWorkspace,
  }) => {
    // Second user sends a message so we have something to mark as unread
    const secondApi = await addMemberViaInvite(testWorkspace.api, SECOND_USER, testWorkspace.slug);
    const channel = await secondApi.getChannelByName("general");
    const msg = `mark-unread-test-${Date.now()}`;
    await secondApi.createMessage(channel.id, msg);

    // First user opens the workspace and navigates to #general
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    // Wait for the message to appear
    await expect(page.getByText(msg)).toBeVisible();

    // Hover over the message to show action bar
    const messageEl = page.locator(`[data-message-id]`, { has: page.getByText(msg) });
    await messageEl.hover();

    // Click the overflow menu
    const overflowMenu = messageEl.getByTestId("message-overflow-menu");
    await expect(overflowMenu).toBeVisible();
    await overflowMenu.click();

    // "Mark as unread" should be in the dropdown
    const markUnreadBtn = page.getByTestId("mark-unread-action");
    await expect(markUnreadBtn).toBeVisible();
    await expect(markUnreadBtn).toHaveText("Mark as unread");

    // Click it
    await markUnreadBtn.click();

    // Sidebar should now show an unread badge for #general
    const badge = page.getByTestId(`unread-badge-${channel.id}`);
    await expect(badge).toBeVisible({ timeout: 5000 });
  });
});
