import { expect } from "@playwright/test";
import { test } from "./helpers/test-workspace";
import { openWorkspaceChannel } from "./helpers/chat-ui";

test.describe("Draft Message Persistence", () => {
  test("draft is restored when switching channels and back", async ({ page, testWorkspace }) => {
    await openWorkspaceChannel(page, testWorkspace.slug, "general");

    // Type a draft message in #general
    const editor = page.locator(".tiptap");
    await editor.click();
    await page.keyboard.type("my draft message");

    // Wait for debounce to save
    await page.waitForTimeout(400);

    // Switch to #random
    await page.getByText("# random").click();
    await page.locator(".tiptap").waitFor();

    // Editor in #random should be empty
    await expect(page.locator(".tiptap")).not.toContainText("my draft message");

    // Switch back to #general
    await page.getByText("# general").click();
    await page.locator(".tiptap").waitFor();

    // Draft should be restored
    await expect(page.locator(".tiptap")).toContainText("my draft message");
  });

  test("draft is cleared after sending a message", async ({ page, testWorkspace }) => {
    await openWorkspaceChannel(page, testWorkspace.slug, "general");

    // Type and send a message
    const editor = page.locator(".tiptap");
    await editor.click();
    await page.keyboard.type("sent message");

    // Wait for debounce to save
    await page.waitForTimeout(400);

    // Send the message
    const sent = page.waitForResponse(
      (res) => res.url().includes("/messages") && res.request().method() === "POST" && res.status() === 201,
    );
    await page.keyboard.press("Enter");
    await sent;

    // Switch away and back
    await page.getByText("# random").click();
    await page.locator(".tiptap").waitFor();
    await page.getByText("# general").click();
    await page.locator(".tiptap").waitFor();

    // Editor should be empty (draft was cleared on send)
    const text = await page.locator(".tiptap").textContent();
    expect(text?.trim()).toBe("");
  });
});
