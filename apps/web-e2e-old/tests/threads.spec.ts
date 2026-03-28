import { expect, type Page } from "@playwright/test";
import { test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";

async function openGeneralChannel(page: Page, workspaceSlug: string) {
  // Clear sidebar collapse state that may persist from other tests in same worker
  await page.addInitScript(() => localStorage.removeItem("openslaq-sidebar-collapse"));

  // Navigate and handle auth redirect if needed (retry only for auth)
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto(`/w/${workspaceSlug}`);
    const signInHeading = page.getByRole("heading", { name: "Sign in to your account" });
    if (await signInHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
      await setupMockAuth(page);
      continue;
    }
    break;
  }

  // Wait generously for channels to load (under parallel test load, API can be slow)
  const generalButton = page.getByRole("button", { name: "# general" });
  await expect(generalButton).toBeVisible({ timeout: 30000 });
  await generalButton.click();
}

test.describe("Threads", () => {
  test("reply in thread button visible on hover", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    await testWorkspace.api.createMessage(channel.id, `thread-test-${Date.now()}`);

    await setupMockAuth(page);
    await openGeneralChannel(page, testWorkspace.slug);

    // Wait for message to load
    await expect(page.getByText("thread-test-")).toBeVisible();

    // Reply button should be visible after hover
    await page.getByText("thread-test-").hover();
    await expect(page.getByTestId("reply-action-trigger")).toBeVisible();
  });

  test("clicking reply opens thread panel", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    await testWorkspace.api.createMessage(channel.id, `open-thread-${Date.now()}`);

    await setupMockAuth(page);
    await openGeneralChannel(page, testWorkspace.slug);

    await expect(page.getByText("open-thread-")).toBeVisible();

    // Hover message to reveal action bar, then click reply
    await page.getByText("open-thread-").hover();
    await page.getByTestId("reply-action-trigger").click();

    // Thread panel should appear
    await expect(page.getByTestId("thread-panel")).toBeVisible();
    await expect(page.getByTestId("thread-panel").locator("span").getByText("Thread", { exact: true })).toBeVisible();
  });

  test("reply count indicator shows after posting reply", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const msg = await testWorkspace.api.createMessage(channel.id, `count-test-${Date.now()}`);

    // Create a reply via API
    await testWorkspace.api.createThreadReply(channel.id, msg.id, "a reply");

    await setupMockAuth(page);
    await openGeneralChannel(page, testWorkspace.slug);

    await expect(page.getByText("count-test-")).toBeVisible();

    // Reply count should show "1 reply"
    await expect(page.getByTestId(`thread-replies-${msg.id}`)).toContainText("1 reply");
  });

  test("thread panel shows replies", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const msg = await testWorkspace.api.createMessage(channel.id, `panel-replies-${Date.now()}`);
    await testWorkspace.api.createThreadReply(channel.id, msg.id, "first reply");
    await testWorkspace.api.createThreadReply(channel.id, msg.id, "second reply");

    await setupMockAuth(page);
    await openGeneralChannel(page, testWorkspace.slug);

    await expect(page.getByText("panel-replies-")).toBeVisible();

    // Hover message to reveal action bar, then click reply
    await page.getByText("panel-replies-").hover();
    await page.getByTestId("reply-action-trigger").click();
    await expect(page.getByTestId("thread-panel")).toBeVisible();

    // Replies should be visible in the panel
    await expect(page.getByText("first reply")).toBeVisible();
    await expect(page.getByText("second reply")).toBeVisible();
  });

  test("thread panel shows loading state while thread data is in flight", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const msg = await testWorkspace.api.createMessage(channel.id, `loading-thread-${Date.now()}`);
    await testWorkspace.api.createThreadReply(channel.id, msg.id, "loading reply");

    await setupMockAuth(page);
    await openGeneralChannel(page, testWorkspace.slug);
    await expect(page.getByText("loading-thread-")).toBeVisible();

    await page.route(`**/api/workspaces/${testWorkspace.slug}/channels/${channel.id}/messages/${msg.id}/replies**`, async (route) => {
      await page.waitForTimeout(300);
      await route.continue();
    });

    await page.getByText("loading-thread-").hover();
    await page.getByTestId("reply-action-trigger").click();
    await expect(page.getByText("Loading thread...")).toBeVisible();
    await expect(page.getByTestId("thread-panel")).toContainText("loading reply");
  });

  test("close thread panel", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    await testWorkspace.api.createMessage(channel.id, `close-test-${Date.now()}`);

    await setupMockAuth(page);
    await openGeneralChannel(page, testWorkspace.slug);

    await expect(page.getByText("close-test-")).toBeVisible();

    // Hover message to reveal action bar, then click reply
    await page.getByText("close-test-").hover();
    await page.getByTestId("reply-action-trigger").click();
    await expect(page.getByTestId("thread-panel")).toBeVisible();

    // Close thread panel
    await page.getByTestId("thread-close").click();
    await expect(page.getByTestId("thread-panel")).not.toBeVisible();
  });

  test("thread replies don't appear in main channel", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const ts = Date.now();
    const msg = await testWorkspace.api.createMessage(channel.id, `main-only-${ts}`);
    const replyContent = `hidden-reply-${ts}`;
    await testWorkspace.api.createThreadReply(channel.id, msg.id, replyContent);

    await setupMockAuth(page);
    await openGeneralChannel(page, testWorkspace.slug);

    // Parent should be visible in main channel
    await expect(page.getByText(`main-only-${ts}`)).toBeVisible();

    // Reply should NOT be in the main message list
    // (it might appear once the thread panel is opened, so check outside thread panel)
    const mainContent = page.locator("div").filter({ has: page.getByText(`main-only-${ts}`) }).first();
    await expect(mainContent).not.toContainText(replyContent);
  });

  test("thread panel loads newest replies first, loads older on scroll up", async ({ page, testWorkspace }) => {
    test.setTimeout(180000);

    const channel = await testWorkspace.api.getChannelByName("general");
    const parentContent = `thread-parent-${Date.now()}`;
    const msg = await testWorkspace.api.createMessage(channel.id, parentContent);

    // Create 51 replies sequentially (above 50 page size — must be sequential
    // because each reply updates the same parent message's thread metadata)
    for (let i = 1; i <= 51; i++) {
      await testWorkspace.api.createThreadReply(
        channel.id,
        msg.id,
        `reply-${String(i).padStart(3, "0")}`,
      );
    }

    await setupMockAuth(page);
    await openGeneralChannel(page, testWorkspace.slug);
    await expect(page.getByText(parentContent)).toBeVisible();

    // Hover message to reveal action bar, then click reply
    await page.getByText(parentContent).hover();
    await page.getByTestId("reply-action-trigger").click();
    await expect(page.getByTestId("thread-panel")).toBeVisible();

    // Wait for initial replies to load — newest replies should be visible first
    // (reply-051 is the newest, should be in the initial page)
    await expect(page.getByText("reply-051")).toBeVisible({ timeout: 15000 });

    // Scroll to top of thread panel to trigger loading older replies.
    // Use toPass() to retry scrolling — the first scroll may not trigger pagination
    // if the container hasn't finished rendering.
    const scrollContainer = page.getByTestId("thread-panel").locator(".overflow-y-auto");
    await expect(async () => {
      await scrollContainer.evaluate((el) => {
        el.scrollTop = 0;
      });
      await expect(page.getByText("reply-001")).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 60_000, intervals: [500, 1000, 2000, 3000] });
  });

  test("send reply via thread panel UI", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const ts = Date.now();
    await testWorkspace.api.createMessage(channel.id, `ui-reply-parent-${ts}`);

    await setupMockAuth(page);
    await openGeneralChannel(page, testWorkspace.slug);

    await expect(page.getByText(`ui-reply-parent-${ts}`)).toBeVisible();

    // Hover message to reveal action bar, then click reply
    await page.getByText(`ui-reply-parent-${ts}`).hover();
    await page.getByTestId("reply-action-trigger").click();
    await expect(page.getByTestId("thread-panel")).toBeVisible();

    // Type a reply in the thread panel's message input and send
    const threadInput = page.getByTestId("thread-panel").locator(".tiptap");
    await threadInput.click();
    const replyContent = `ui-thread-reply-${ts}`;
    await page.keyboard.type(replyContent);

    const sent = page.waitForResponse(
      (res) => res.url().includes("/replies") && res.request().method() === "POST" && res.status() === 201,
    );
    await page.keyboard.press("Enter");
    await sent;

    // Reply should appear in thread panel
    await expect(page.getByTestId("thread-panel").getByText(replyContent)).toBeVisible();
  });

  test("deleting parent message closes thread panel", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const ts = Date.now();
    const msg = await testWorkspace.api.createMessage(channel.id, `delete-parent-${ts}`);
    await testWorkspace.api.createThreadReply(channel.id, msg.id, `child-reply-${ts}`);

    await setupMockAuth(page);
    await openGeneralChannel(page, testWorkspace.slug);
    await expect(page.getByText(`delete-parent-${ts}`)).toBeVisible();

    // Hover message to reveal action bar, then click reply
    await page.getByText(`delete-parent-${ts}`).hover();
    await page.getByTestId("reply-action-trigger").click();
    await expect(page.getByTestId("thread-panel")).toBeVisible();
    await expect(page.getByText(`child-reply-${ts}`)).toBeVisible();

    // Delete parent message via API (simulates another user or server-side deletion)
    await testWorkspace.api.deleteMessage(msg.id);

    // Thread panel should close
    await expect(page.getByTestId("thread-panel")).not.toBeVisible({ timeout: 10000 });
  });
});
