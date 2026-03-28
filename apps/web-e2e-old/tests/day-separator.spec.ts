import { expect } from "@playwright/test";
import { sharedTest as test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";

test.describe("Day Separators", () => {
  test("Today separator appears above first message", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    await testWorkspace.api.createMessage(channel.id, `day-sep-test-${Date.now()}`);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    // Day separator should appear with "Today" label
    const separator = page.getByTestId("day-separator").first();
    await expect(separator).toBeVisible();
    await expect(separator).toContainText("Today");
  });

  test("multiple same-day messages produce only one separator", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const ts = Date.now();
    await testWorkspace.api.createMessage(channel.id, `msg-a-${ts}`);
    await testWorkspace.api.createMessage(channel.id, `msg-b-${ts}`);
    await testWorkspace.api.createMessage(channel.id, `msg-c-${ts}`);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    // Wait for messages to load (generous timeout — API can be slow under parallel load)
    await expect(page.getByText(`msg-a-${ts}`)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(`msg-c-${ts}`)).toBeVisible();

    // Get today's date key
    const now = new Date();
    const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // There should be exactly one separator for today
    const todaySeparators = page.locator(`[data-testid="day-separator"][data-date="${dateKey}"]`);
    await expect(todaySeparators).toHaveCount(1);
  });

  test("separator in thread panel", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const parent = await testWorkspace.api.createMessage(channel.id, `thread-parent-${Date.now()}`);
    await testWorkspace.api.createThreadReply(channel.id, parent.id, `reply-${Date.now()}`);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    // Wait for message to appear, then open thread via reply count
    await expect(page.getByText(parent.content)).toBeVisible();
    await page.locator("text=1 reply").first().click();
    await expect(page.getByTestId("thread-panel")).toBeVisible();

    // Wait for loading to finish before asserting content
    await expect(page.getByTestId("thread-panel").getByText("Loading thread...")).not.toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("thread-panel")).toContainText(parent.content);
  });
});
