import { expect } from "@playwright/test";
import { test } from "./helpers/test-workspace";
import { openWorkspaceChannel, sendMessageAndWait } from "./helpers/chat-ui";

test.describe("Link previews", () => {
  test("sending a message with URL shows link preview card", async ({ page, testWorkspace }) => {
    await openWorkspaceChannel(page, testWorkspace.slug);

    await sendMessageAndWait(page, "Check out https://github.com");

    // Wait for the link preview to appear (async unfurl ~1-6s)
    await expect(page.getByTestId("link-preview").first()).toBeVisible({ timeout: 15000 });
  });

  test("message without URL shows no link preview", async ({ page, testWorkspace }) => {
    await openWorkspaceChannel(page, testWorkspace.slug);

    await sendMessageAndWait(page, "Hello, no links here at all");

    // Wait a bit and verify no preview appears
    await page.waitForTimeout(3000);
    await expect(page.getByTestId("link-preview")).not.toBeVisible();
  });
});
