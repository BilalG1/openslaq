import { expect } from "@playwright/test";
import { isolatedTest as test } from "./fixtures";
import { setupMockAuth } from "./helpers/mock-auth";
import { openWorkspaceChannel } from "./helpers/ui";

test.describe("Channels", () => {
  test("channel created via API appears in sidebar", async ({ page, testWorkspace }) => {
    const name = `test-ch-${Date.now()}`;
    await testWorkspace.api.createChannel(name, "e2e test channel");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    await expect(page.getByText(`# ${name}`)).toBeVisible();
  });

  test("switch between channels loads correct messages", async ({ page, testWorkspace }) => {
    const generalCh = await testWorkspace.api.getChannelByName("general");
    const randomCh = await testWorkspace.api.getChannelByName("random");

    const generalMsg = `in-general-${Date.now()}`;
    const randomMsg = `in-random-${Date.now()}`;
    await testWorkspace.api.createMessage(generalCh.id, generalMsg);
    await testWorkspace.api.createMessage(randomCh.id, randomMsg);

    await openWorkspaceChannel(page, testWorkspace.slug, "general");

    // General shows its message
    await expect(page.getByText(generalMsg)).toBeVisible();
    await expect(page.getByText(randomMsg)).not.toBeVisible();

    // Switch to random
    await page.getByText("# random").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    await expect(page.getByText(randomMsg)).toBeVisible();
    await expect(page.getByText(generalMsg)).not.toBeVisible();
  });

  test("browse channels dialog shows available channels", async ({ page, testWorkspace }) => {
    const name = `browse-ch-${Date.now()}`;
    await testWorkspace.api.createChannel(name);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // Open browse channels
    await page.getByTestId("browse-channels-button").click();

    // Dialog shows the channel
    await expect(page.getByText(name)).toBeVisible();
  });
});
