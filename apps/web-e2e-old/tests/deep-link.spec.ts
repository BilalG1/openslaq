import { expect } from "@playwright/test";
import { sharedTest as test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";
import { DEFAULT_USER } from "./helpers/api";

test.describe("Deep Link Navigation", () => {
  test("deep link to channel navigates correctly", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("random");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await expect(page.locator(".tiptap")).toBeVisible();

    // Simulate a deep link arriving via window.__openslaqDeepLink
    await page.evaluate(
      ({ slug, channelId }) => {
        (window as unknown as { __openslaqDeepLink: (url: string) => void }).__openslaqDeepLink(`openslaq://w/${slug}/c/${channelId}`);
      },
      { slug: testWorkspace.slug, channelId: channel.id },
    );

    // Should navigate to the #random channel
    await expect(page.getByText("# random").first()).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/w/${testWorkspace.slug}/c/${channel.id}`));
  });

  test("deep link to DM navigates correctly", async ({ page, testWorkspace }) => {
    // Create a DM to get a DM channel ID
    const { channel: dmChannel } = await testWorkspace.api.createDm(DEFAULT_USER.userId);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await expect(page.locator(".tiptap")).toBeVisible();

    // Simulate deep link to DM
    await page.evaluate(
      ({ slug, dmChannelId }) => {
        (window as unknown as { __openslaqDeepLink: (url: string) => void }).__openslaqDeepLink(`openslaq://w/${slug}/dm/${dmChannelId}`);
      },
      { slug: testWorkspace.slug, dmChannelId: dmChannel.id },
    );

    // Should navigate to the DM — URL should contain the DM channel ID
    await expect(page).toHaveURL(new RegExp(`/w/${testWorkspace.slug}/dm/${dmChannel.id}`));
  });

  test("openslaq://open just opens the app without errors", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await expect(page.locator(".tiptap")).toBeVisible();

    // The current channel before the deep link
    const urlBefore = page.url();

    // Simulate an open-only deep link
    await page.evaluate(() => {
      (window as unknown as { __openslaqDeepLink: (url: string) => void }).__openslaqDeepLink("openslaq://open");
    });

    // Should not navigate away — no crash, URL unchanged
    await expect(page).toHaveURL(urlBefore);
  });

  test("unrecognized deep link path falls back to open", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await expect(page.locator(".tiptap")).toBeVisible();

    const urlBefore = page.url();

    await page.evaluate(() => {
      (window as unknown as { __openslaqDeepLink: (url: string) => void }).__openslaqDeepLink("openslaq://some/unknown/path");
    });

    // Should not navigate away
    await expect(page).toHaveURL(urlBefore);
  });
});
