import { expect } from "@playwright/test";
import { test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";

test.describe("Loading error states", () => {
  test("shows workspace bootstrap error when initial channel load fails", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);

    await page.route(`**/api/workspaces/${testWorkspace.slug}/channels**`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Bootstrap channels failed" }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto(`/w/${testWorkspace.slug}`);
    await expect(page.getByText("Bootstrap channels failed")).toBeVisible();
  });

  test("shows channel message load error", async ({ page, testWorkspace }) => {
    const channelName = `error-channel-${Date.now()}`;
    const channel = await testWorkspace.api.createChannel(channelName);

    await setupMockAuth(page);
    await page.route(`**/api/workspaces/${testWorkspace.slug}/channels/${channel.id}/messages**`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Channel messages failed" }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText(`# ${channelName}`).click();
    await expect(page.getByText("Channel messages failed")).toBeVisible();
  });

  test("shows thread load error when replies request fails", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const message = await testWorkspace.api.createMessage(channel.id, `thread-error-${Date.now()}`);

    await setupMockAuth(page);
    await page.route(
      `**/api/workspaces/${testWorkspace.slug}/channels/${channel.id}/messages/${message.id}/replies**`,
      async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ error: "Thread replies failed" }),
          });
          return;
        }
        await route.continue();
      },
    );

    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await page.getByText("thread-error-").hover();
    await page.getByTestId("reply-action-trigger").click();
    await expect(page.getByTestId("thread-panel")).toContainText("Thread replies failed");
  });
});
