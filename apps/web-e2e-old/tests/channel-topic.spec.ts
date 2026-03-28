import { expect } from "@playwright/test";
import { test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";

test.describe("Channel topic / description", () => {
  test("shows 'Add a topic' placeholder when no description", async ({ page, testWorkspace }) => {
    // Ensure general has no description
    const channel = await testWorkspace.api.getChannelByName("general");
    await testWorkspace.api.updateChannelDescription(channel.id, null);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").first().click();

    await expect(page.getByTestId("channel-topic-placeholder")).toBeVisible();
    await expect(page.getByTestId("channel-topic-placeholder")).toHaveText("Add a topic");
  });

  test("channel with description shows topic text", async ({ page, testWorkspace }) => {
    // Set description via API
    const channel = await testWorkspace.api.getChannelByName("general");
    await testWorkspace.api.updateChannelDescription(channel.id, "Team announcements and updates");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    await expect(page.getByTestId("channel-topic-text")).toBeVisible();
    await expect(page.getByTestId("channel-topic-text")).toHaveText("Team announcements and updates");
  });

  test("click topic → edit → Enter saves → new text visible", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    // Click the placeholder to start editing
    await page.getByTestId("channel-topic-button").click();
    const input = page.getByTestId("channel-topic-input");
    await expect(input).toBeVisible();

    // Type a new topic and save
    await input.fill("New channel topic");
    await input.press("Enter");

    // Verify the topic text is now visible
    await expect(page.getByTestId("channel-topic-text")).toBeVisible();
    await expect(page.getByTestId("channel-topic-text")).toHaveText("New channel topic");
  });

  test("clear topic → shows placeholder", async ({ page, testWorkspace }) => {
    // Set description via API first
    const channel = await testWorkspace.api.getChannelByName("general");
    await testWorkspace.api.updateChannelDescription(channel.id, "Some topic to clear");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    // Verify topic is shown
    await expect(page.getByTestId("channel-topic-text")).toHaveText("Some topic to clear");

    // Click to edit, clear, and press Enter
    await page.getByTestId("channel-topic-button").click();
    const input = page.getByTestId("channel-topic-input");
    await input.fill("");
    await input.press("Enter");

    // Should show placeholder
    await expect(page.getByTestId("channel-topic-placeholder")).toBeVisible();
  });
});
