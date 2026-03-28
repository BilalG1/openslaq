import { expect } from "@playwright/test";
import { test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";

test.describe("Channel management", () => {
  test("newly created channel appears in sidebar", async ({ page, testWorkspace }) => {
    const name = `test-ch-${Date.now()}`;
    await testWorkspace.api.createChannel(name, "e2e test channel");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // The new channel should be in the sidebar
    await expect(page.getByText(`# ${name}`)).toBeVisible();
  });

  test("navigate to new channel shows empty state and editor", async ({ page, testWorkspace }) => {
    const name = `empty-ch-${Date.now()}`;
    await testWorkspace.api.createChannel(name);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    await expect(page.getByText(`# ${name}`)).toBeVisible();
    await page.getByText(`# ${name}`).click();

    // Empty state message
    await expect(page.getByText("No messages yet. Start the conversation!")).toBeVisible();

    // Editor should be available
    await expect(page.locator(".tiptap")).toBeVisible();
  });

  test("can send a message in a newly created channel", async ({ page, testWorkspace }) => {
    const name = `send-ch-${Date.now()}`;
    await testWorkspace.api.createChannel(name);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    const channelButton = page.getByRole("button", { name: `# ${name}` });
    await expect(channelButton).toBeVisible();
    await channelButton.click();
    await expect(page.locator(".tiptap")).toBeVisible();

    const msg = `first-msg-${Date.now()}`;
    const editor = page.locator(".tiptap");
    await editor.click();
    await page.keyboard.type(msg);
    const sent = page.waitForResponse(
      (res) => res.url().includes("/messages") && res.request().method() === "POST" && res.status() === 201,
    );
    await page.keyboard.press("Enter");
    await sent;

    // Switch to general and back to re-fetch
    await page.getByText("# general").click();
    await page.locator(".tiptap").waitFor();
    const loaded = page.waitForResponse(
      (res) =>
        res.url().includes(`/workspaces/${testWorkspace.slug}/channels`) &&
        res.url().includes("/messages") &&
        res.request().method() === "GET",
    );
    await channelButton.click();
    await loaded;

    await expect(page.getByText(msg)).toBeVisible();
  });
});
