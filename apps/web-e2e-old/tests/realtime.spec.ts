import { expect, type BrowserContext, type Page } from "@playwright/test";
import { test, addMemberViaInvite } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";
import { SECOND_USER } from "./helpers/api";

async function openSecondUserSession(page: Page, workspaceSlug: string): Promise<{
  context: BrowserContext;
  page: Page;
}> {
  const browser = page.context().browser();
  if (!browser) {
    throw new Error("Browser instance is unavailable");
  }

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

async function typeInComposer(page: Page, text: string): Promise<void> {
  const editor = page.locator(".tiptap");
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.type(text);
}

test.describe("Multi-user message visibility", () => {
  test("message from another user is visible", async ({ page, testWorkspace }) => {
    const secondApi = await addMemberViaInvite(testWorkspace.api, SECOND_USER, testWorkspace.slug);
    const channel = await secondApi.getChannelByName("general");

    const msg = `from-second-user-${Date.now()}`;
    await secondApi.createMessage(channel.id, msg);

    // First user browses to the channel
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    // Message from second user should be visible
    await expect(page.getByText(msg)).toBeVisible();

    // Second user's displayName should appear as the author
    await expect(page.getByText(SECOND_USER.displayName).first()).toBeVisible();
  });

  test("edited message from another user shows updated content", async ({ page, testWorkspace }) => {
    const secondApi = await addMemberViaInvite(testWorkspace.api, SECOND_USER, testWorkspace.slug);
    const channel = await secondApi.getChannelByName("general");

    const original = `rt-original-${Date.now()}`;
    const updated = `rt-updated-${Date.now()}`;
    const msg = await secondApi.createMessage(channel.id, original);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    // Original message visible
    await expect(page.getByText(original)).toBeVisible();

    // Second user edits the message — should update in real-time via socket
    await secondApi.editMessage(msg.id, updated);

    await expect(page.getByText(updated)).toBeVisible();
    await expect(page.getByText(original)).not.toBeVisible();
  });

  test("deleted message from another user disappears", async ({ page, testWorkspace }) => {
    const secondApi = await addMemberViaInvite(testWorkspace.api, SECOND_USER, testWorkspace.slug);
    const channel = await secondApi.getChannelByName("general");

    const content = `rt-delete-${Date.now()}`;
    const msg = await secondApi.createMessage(channel.id, content);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    await expect(page.getByText(content)).toBeVisible();

    // Second user deletes the message — should disappear in real-time via socket
    await secondApi.deleteMessage(msg.id);

    await expect(page.getByText(content)).not.toBeVisible();
  });

  test("rejoins channel after reconnect and receives new realtime messages", async ({
    page,
    context,
    testWorkspace,
  }) => {
    const secondApi = await addMemberViaInvite(testWorkspace.api, SECOND_USER, testWorkspace.slug);
    const channel = await secondApi.getChannelByName("general");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    await context.setOffline(true);
    // Brief pause ensures Socket.IO detects the network loss before we restore it
    await page.waitForTimeout(500);
    await context.setOffline(false);

    const messageAfterReconnect = `post-reconnect-${Date.now()}`;
    await secondApi.createMessage(channel.id, messageAfterReconnect);

    await expect(page.getByText(messageAfterReconnect)).toBeVisible();
  });

  test("reply from another user appears in open thread panel", async ({ page, testWorkspace }) => {
    const secondApi = await addMemberViaInvite(testWorkspace.api, SECOND_USER, testWorkspace.slug);
    const channel = await secondApi.getChannelByName("general");

    // Create a parent message
    const parentContent = `rt-thread-parent-${Date.now()}`;
    const msg = await testWorkspace.api.createMessage(channel.id, parentContent);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    await expect(page.getByText(parentContent)).toBeVisible();

    // Hover message to reveal action bar, then click reply
    await page.getByText(parentContent).hover();
    await page.getByTestId("reply-action-trigger").click();
    await expect(page.getByTestId("thread-panel")).toBeVisible();

    // Second user sends a reply via API
    const replyContent = `rt-thread-reply-${Date.now()}`;
    await secondApi.createThreadReply(channel.id, msg.id, replyContent);

    // Reply should appear in the thread panel. Under load we may need one refetch if the
    // socket event arrives late, so poll and reopen the panel between checks.
    await expect
      .poll(async () => {
        if (await page.getByTestId("thread-panel").getByText(replyContent).isVisible().catch(() => false)) {
          return true;
        }
        if (await page.getByTestId("thread-panel").isVisible().catch(() => false)) {
          await page.getByTestId("thread-close").click();
        }
        await page.getByText(parentContent).hover();
        await page.getByTestId("reply-action-trigger").click();
        return page.getByTestId("thread-panel").getByText(replyContent).isVisible().catch(() => false);
      }, { timeout: 20000 })
      .toBe(true);
  });

  test("shows and expires typing indicator in channels", async ({ page, testWorkspace }) => {
    await addMemberViaInvite(testWorkspace.api, SECOND_USER, testWorkspace.slug);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    const secondSession = await openSecondUserSession(page, testWorkspace.slug);

    try {
      await secondSession.page.getByText("# general").click();
      await expect(page.getByTestId("typing-indicator")).toHaveCount(0);

      await typeInComposer(secondSession.page, `typing-channel-${Date.now()}`);

      await expect(page.getByTestId("typing-indicator")).toContainText(`${SECOND_USER.displayName} is typing...`);
      await expect(page.getByTestId("typing-indicator")).toHaveCount(0, { timeout: 8000 });
    } finally {
      await secondSession.context.close();
    }
  });

  test("shows typing indicator in DMs", async ({ page, testWorkspace }) => {
    await addMemberViaInvite(testWorkspace.api, SECOND_USER, testWorkspace.slug);
    await testWorkspace.api.createDm(SECOND_USER.userId);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByRole("button", { name: new RegExp(`^${SECOND_USER.displayName}`) }).click();
    await expect(page.locator(".tiptap")).toBeVisible();

    const secondSession = await openSecondUserSession(page, testWorkspace.slug);
    try {
      await secondSession.page.getByRole("button", { name: /^Test User/ }).click();
      await expect(secondSession.page.locator(".tiptap")).toBeVisible();

      await typeInComposer(secondSession.page, `typing-dm-${Date.now()}`);

      await expect(page.getByTestId("typing-indicator")).toContainText(`${SECOND_USER.displayName} is typing...`);
    } finally {
      await secondSession.context.close();
    }
  });

  test("keeps typing indicator out of thread panel", async ({ page, testWorkspace }) => {
    await addMemberViaInvite(testWorkspace.api, SECOND_USER, testWorkspace.slug);
    const channel = await testWorkspace.api.getChannelByName("general");
    const parentContent = `typing-thread-parent-${Date.now()}`;
    await testWorkspace.api.createMessage(channel.id, parentContent);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await page.getByText(parentContent).hover();
    await page.getByTestId("reply-action-trigger").click();
    await expect(page.getByTestId("thread-panel")).toBeVisible();

    const secondSession = await openSecondUserSession(page, testWorkspace.slug);
    try {
      await secondSession.page.getByText("# general").click();
      await typeInComposer(secondSession.page, `typing-thread-${Date.now()}`);

      await expect(page.getByTestId("typing-indicator")).toContainText(`${SECOND_USER.displayName} is typing...`);
      await expect(page.getByTestId("thread-panel").getByTestId("typing-indicator")).toHaveCount(0);
    } finally {
      await secondSession.context.close();
    }
  });
});
