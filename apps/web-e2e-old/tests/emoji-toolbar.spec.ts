import { expect } from "@playwright/test";
import { sharedTest as test } from "./helpers/test-workspace";
import { openWorkspaceChannel } from "./helpers/chat-ui";

test.describe("Emoji Toolbar Picker", () => {
  test("click emoji toolbar button opens picker and inserts emoji", async ({ page, testWorkspace }) => {
    await openWorkspaceChannel(page, testWorkspace.slug, "general");

    // Click the emoji toolbar button
    await page.getByTestId("emoji-toolbar-button").click();
    await expect(page.getByTestId("emoji-picker")).toBeVisible();

    // Search and select an emoji
    const searchInput = page.locator("em-emoji-picker input");
    await searchInput.fill("thumbsup");
    await page.getByRole("button", { name: "👍" }).click();

    // Picker should close
    await expect(page.getByTestId("emoji-picker")).not.toBeVisible();

    // Emoji should appear in the editor
    await expect(page.locator(".tiptap")).toContainText("👍");
  });

  test("click outside emoji picker closes it", async ({ page, testWorkspace }) => {
    await openWorkspaceChannel(page, testWorkspace.slug, "general");

    // Open the emoji picker
    await page.getByTestId("emoji-toolbar-button").click();
    await expect(page.getByTestId("emoji-picker")).toBeVisible();

    // Click outside the picker to dismiss it (use dispatchEvent to avoid interception)
    await page.mouse.click(10, 10);

    // Picker should close
    await expect(page.getByTestId("emoji-picker")).not.toBeVisible();
  });
});
