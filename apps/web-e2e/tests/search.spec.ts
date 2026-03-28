import { expect } from "@playwright/test";
import { test } from "./fixtures";
import { openWorkspaceChannel } from "./helpers/ui";

test.describe("Search", () => {
  test("search finds seeded messages and navigates to result", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const uniqueWord = `searchable${Date.now()}`;
    await testWorkspace.api.createMessage(channel.id, `This is a ${uniqueWord} message for testing`);

    await openWorkspaceChannel(page, testWorkspace.slug);

    // Open search with keyboard shortcut
    await page.keyboard.press("Meta+k");
    await expect(page.getByTestId("search-modal")).toBeVisible();
    await expect(page.getByTestId("search-input")).toBeFocused();

    // Type and wait for results
    await page.getByTestId("search-input").fill(uniqueWord);
    await expect(page.getByTestId("search-results")).toContainText(uniqueWord);

    // Click the result (results are divs with onClick, not buttons)
    await page.getByTestId("search-results").locator("[class*='cursor-pointer']").first().click();

    // Modal closes and message is visible in the channel
    await expect(page.getByTestId("search-modal")).not.toBeVisible();
    await expect(page.getByText(uniqueWord)).toBeVisible();
  });

  test("no results shows empty state", async ({ page, testWorkspace }) => {
    await openWorkspaceChannel(page, testWorkspace.slug);

    await page.keyboard.press("Meta+k");
    await page.getByTestId("search-input").fill("zzzznonexistentquery999");
    await expect(page.getByTestId("search-no-results")).toBeVisible();
  });
});
