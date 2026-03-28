import { expect } from "@playwright/test";
import { test, addMemberViaInvite } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";
import { SECOND_USER } from "./helpers/api";

test.describe("Unread counts", () => {
  test("unread badge appears when another user sends a message", async ({ page, testWorkspace }) => {
    const secondApi = await addMemberViaInvite(testWorkspace.api, SECOND_USER, testWorkspace.slug);
    const channel = await secondApi.getChannelByName("general");

    // Navigate and select 'random' channel first so 'general' is not active
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# random").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // Second user sends a message to 'general'
    await secondApi.createMessage(channel.id, `unread-test-${Date.now()}`);

    // Badge should appear on 'general' channel
    await expect(page.getByTestId(`unread-badge-${channel.id}`)).toBeVisible();
  });

  test("badge clears when clicking on the channel", async ({ page, testWorkspace }) => {
    const secondApi = await addMemberViaInvite(testWorkspace.api, SECOND_USER, testWorkspace.slug);
    const channel = await secondApi.getChannelByName("general");

    // Navigate and select 'random' channel
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# random").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // Second user sends a message to 'general'
    await secondApi.createMessage(channel.id, `unread-clear-${Date.now()}`);

    // Wait for badge to appear
    await expect(page.getByTestId(`unread-badge-${channel.id}`)).toBeVisible();

    // Click on 'general' channel to view it
    await page.getByText("# general").click();

    // Badge should disappear
    await expect(page.getByTestId(`unread-badge-${channel.id}`)).not.toBeVisible();
  });

  test("badge shows correct count for multiple unread messages", async ({ page, testWorkspace }) => {
    const secondApi = await addMemberViaInvite(testWorkspace.api, SECOND_USER, testWorkspace.slug);
    const channel = await secondApi.getChannelByName("general");

    // Navigate and select 'random' channel
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# random").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // Second user sends 3 messages to 'general'
    const ts = Date.now();
    await secondApi.createMessage(channel.id, `multi-1-${ts}`);
    await secondApi.createMessage(channel.id, `multi-2-${ts}`);
    await secondApi.createMessage(channel.id, `multi-3-${ts}`);

    // Badge should show count of 3
    const badge = page.getByTestId(`unread-badge-${channel.id}`);
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText("3");
  });
});
