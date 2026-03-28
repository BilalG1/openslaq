import { expect } from "@playwright/test";
import { sharedTest as test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";

test.describe("URL Persistence", () => {
  test("navigate to channel URL loads the correct channel", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("random");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}/c/${channel.id}`);
    await expect(page.locator(".tiptap")).toBeVisible();

    // The #random channel should be selected (header visible)
    await expect(page.getByText("# random").first()).toBeVisible();
  });

  test("clicking a channel updates the URL", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("random");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // Click #random
    await page.getByText("# random").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // URL should contain the channel ID
    await expect(page).toHaveURL(new RegExp(`/w/${testWorkspace.slug}/c/${channel.id}`));
  });

  test("refreshing the page preserves the selected channel", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("random");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // Click #random
    await page.getByText("# random").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // Refresh the page
    await page.reload();
    await expect(page.locator(".tiptap")).toBeVisible();

    // Should still be on #random (the channel header should show random, not general)
    await expect(page).toHaveURL(new RegExp(`/w/${testWorkspace.slug}/c/${channel.id}`));
  });

  test("invalid channel ID falls back to #general", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}/c/nonexistent-channel-id`);
    await expect(page.locator(".tiptap")).toBeVisible();

    // Should fall back to #general
    const generalChannel = await testWorkspace.api.getChannelByName("general");
    await expect(page).toHaveURL(new RegExp(`/w/${testWorkspace.slug}/c/${generalChannel.id}`));
  });
});
