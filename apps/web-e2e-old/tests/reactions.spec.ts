import { expect, type Page } from "@playwright/test";
import { test, addMemberViaInvite } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";
import { SECOND_USER } from "./helpers/api";
import { refreshChannel } from "./helpers/chat-ui";

async function pickThumbsUpEmoji(page: Page) {
  const searchInput = page.locator("em-emoji-picker input");
  await searchInput.fill("thumbsup");
  await page.getByRole("button", { name: "👍" }).click();
}

test.describe("Emoji Reactions", () => {
  test("add reaction via API and verify pill appears", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const msg = `react-test-${Date.now()}`;
    const message = await testWorkspace.api.createMessage(channel.id, msg);

    // Add reaction via API
    await testWorkspace.api.toggleReaction(message.id, "👍");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    await expect(page.getByText(msg)).toBeVisible();

    // Refresh to load reactions
    await refreshChannel(page, "general");

    // Reaction pill should be visible
    const pill = page.getByTestId("reaction-pill-👍").first();
    await expect(pill).toBeVisible();
    await expect(pill).toContainText("1");
  });

  test("hover shows message action bar with reaction trigger", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const msg = `hover-test-${Date.now()}`;
    await testWorkspace.api.createMessage(channel.id, msg);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    await expect(page.getByText(msg)).toBeVisible();

    // Hover over the message to reveal the action bar
    await page.getByText(msg).hover();

    const actionBar = page.getByTestId("message-action-bar");
    await expect(actionBar).toBeVisible();
    await expect(page.getByTestId("reaction-trigger")).toBeVisible();
  });

  test("click active reaction pill → reaction removed", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const msg = `react-remove-${Date.now()}`;
    const message = await testWorkspace.api.createMessage(channel.id, msg);

    // Add reaction via API
    await testWorkspace.api.toggleReaction(message.id, "👍");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    await expect(page.getByText(msg)).toBeVisible();

    // Refresh to ensure reactions are loaded
    await refreshChannel(page, "general");

    // Reaction pill should be visible
    const pill = page.getByTestId("reaction-pill-👍").first();
    await expect(pill).toBeVisible();

    // Click the pill to remove reaction
    await pill.click();

    // Wait for API response
    await page.waitForResponse(
      (res) => res.url().includes("/reactions") && res.request().method() === "POST",
    );

    // Refresh and verify reaction is gone
    await refreshChannel(page, "general");
    await expect(page.getByTestId("reaction-pill-👍")).not.toBeVisible();
  });

  test("reaction from another user shows correct count", async ({ page, testWorkspace }) => {
    const secondApi = await addMemberViaInvite(testWorkspace.api, SECOND_USER, testWorkspace.slug);
    const channel = await testWorkspace.api.getChannelByName("general");
    const msg = `react-count-${Date.now()}`;
    const message = await testWorkspace.api.createMessage(channel.id, msg);

    // Both users add the same reaction via API
    await testWorkspace.api.toggleReaction(message.id, "🎉");
    await secondApi.toggleReaction(message.id, "🎉");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.getByText(msg)).toBeVisible();

    // Refresh to load reactions
    await refreshChannel(page, "general");

    // Verify count shows 2
    const pill = page.getByTestId("reaction-pill-🎉").first();
    await expect(pill).toBeVisible();
    await expect(pill).toContainText("2", { timeout: 10_000 });
  });

  test("reactions visible in thread panel", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const parentMsg = `react-thread-${Date.now()}`;
    const message = await testWorkspace.api.createMessage(channel.id, parentMsg);

    // Add reaction to parent message
    await testWorkspace.api.toggleReaction(message.id, "❤️");

    // Add a reply so we can open the thread
    await testWorkspace.api.createThreadReply(channel.id, message.id, "thread reply");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.getByText(parentMsg)).toBeVisible();

    // Open thread
    await page.getByTestId(`thread-replies-${message.id}`).click();

    // Thread panel should be visible
    const threadPanel = page.getByTestId("thread-panel");
    await expect(threadPanel).toBeVisible();

    // Reaction pill on parent message should be visible in thread
    await expect(threadPanel.getByTestId("reaction-pill-❤️")).toBeVisible();
  });

  test("adding existing reaction from another user increments count", async ({ page, testWorkspace }) => {
    const secondApi = await addMemberViaInvite(testWorkspace.api, SECOND_USER, testWorkspace.slug);
    const channel = await testWorkspace.api.getChannelByName("general");
    const msg = `react-branch-${Date.now()}`;
    const message = await testWorkspace.api.createMessage(channel.id, msg);
    await secondApi.toggleReaction(message.id, "🔥");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.getByText(msg)).toBeVisible();
    await refreshChannel(page, "general");

    const pill = page.getByTestId("reaction-pill-🔥").first();
    await expect(pill).toBeVisible();
    await expect(pill).toContainText("1");

    await pill.click();
    await page.waitForResponse(
      (res) =>
        res.url().includes(`/api/messages/${message.id}/reactions`) &&
        res.request().method() === "POST",
    );

    await refreshChannel(page, "general");
    await expect(page.getByTestId("reaction-pill-🔥").first()).toContainText("2");
  });

  test("quick reaction button adds reaction", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const msg = `quick-react-${Date.now()}`;
    await testWorkspace.api.createMessage(channel.id, msg);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.getByText(msg)).toBeVisible();

    // Hover message to reveal action bar
    await page.getByText(msg).hover();
    await expect(page.getByTestId("message-action-bar")).toBeVisible();

    // Click the ✅ quick reaction button
    const reacted = page.waitForResponse(
      (res) => res.url().includes("/reactions") && res.request().method() === "POST",
    );
    await page.getByTestId("quick-react-✅").click();
    await reacted;

    // Refresh and verify the reaction pill appears
    await refreshChannel(page, "general");
    const pill = page.getByTestId("reaction-pill-✅").first();
    await expect(pill).toBeVisible();
    await expect(pill).toContainText("1");
  });

  test("failed reaction request rolls back optimistic update and shows error", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const msg = `react-fail-${Date.now()}`;
    const message = await testWorkspace.api.createMessage(channel.id, msg);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.getByText(msg)).toBeVisible();

    await page.route(`**/api/messages/${message.id}/reactions`, async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Reaction update failed" }),
        });
        return;
      }
      await route.continue();
    });

    await page.getByText(msg).hover();
    await page.getByTestId("reaction-trigger").click();
    await expect(page.getByTestId("emoji-picker")).toBeVisible();
    await pickThumbsUpEmoji(page);

    await expect(page.getByText("Reaction update failed")).toBeVisible();
    await refreshChannel(page, "general");
    await expect(page.getByTestId("reaction-pill-👍")).not.toBeVisible();
  });
});
