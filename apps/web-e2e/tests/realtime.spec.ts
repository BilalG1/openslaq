import { expect, type BrowserContext, type Page } from "@playwright/test";
import { isolatedTest as test, addMemberViaInvite, SECOND_USER } from "./fixtures";
import { setupMockAuth } from "./helpers/mock-auth";
import { openWorkspaceChannel } from "./helpers/ui";

async function openSecondUserSession(page: Page, workspaceSlug: string): Promise<{
  context: BrowserContext;
  page: Page;
}> {
  const browser = page.context().browser();
  if (!browser) throw new Error("Browser instance is unavailable");

  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  await setupMockAuth(secondPage, {
    id: SECOND_USER.userId,
    displayName: SECOND_USER.displayName,
    email: SECOND_USER.email,
  });
  await secondPage.goto(`/w/${workspaceSlug}`);
  return { context: secondContext, page: secondPage };
}

test.describe("Real-time updates", () => {
  test("message from another user appears without refresh", async ({ page, testWorkspace }) => {
    const secondApi = await addMemberViaInvite(testWorkspace.api, SECOND_USER, testWorkspace.slug);
    const channel = await secondApi.getChannelByName("general");

    await openWorkspaceChannel(page, testWorkspace.slug);

    // Second user sends a message via API — should appear in real-time via socket
    const msg = `realtime-${Date.now()}`;
    await secondApi.createMessage(channel.id, msg);

    await expect(page.getByText(msg)).toBeVisible();
    await expect(page.getByText(SECOND_USER.displayName).first()).toBeVisible();
  });

  test("second user sees message sent from first user's browser", async ({ page, testWorkspace }) => {
    await addMemberViaInvite(testWorkspace.api, SECOND_USER, testWorkspace.slug);

    await openWorkspaceChannel(page, testWorkspace.slug);

    const secondSession = await openSecondUserSession(page, testWorkspace.slug);
    try {
      await secondSession.page.getByText("# general").click();
      await expect(secondSession.page.locator(".tiptap")).toBeVisible();

      // First user types and sends a message in the browser
      const msg = `from-browser-${Date.now()}`;
      const editor = page.locator(".tiptap");
      await editor.click();
      await page.keyboard.type(msg);
      await page.keyboard.press("Enter");

      // Second user sees it in real-time
      await expect(secondSession.page.getByText(msg)).toBeVisible();
    } finally {
      await secondSession.context.close();
    }
  });
});
