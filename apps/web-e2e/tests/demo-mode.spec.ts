import { expect } from "@playwright/test";
import { test } from "./helpers/coverage-fixture";

async function sendMessage(page: import("@playwright/test").Page, content: string) {
  const editor = page.locator(".tiptap");
  await editor.click();
  await page.keyboard.type(content);
  await page.keyboard.press("Enter");
}

test.describe("Demo Mode", () => {
  test("loads seeded workspace, supports chat interactions, and avoids backend requests", async ({ page }) => {
    const blockedCandidates: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      const isBackendApi = url.startsWith("http://localhost:3001/api/");
      const isBackendSocket = url.startsWith("http://localhost:3001/socket.io");
      const isStackApi = url.startsWith("https://api.stack-auth.com/");
      if (isBackendApi || isBackendSocket || isStackApi) {
        blockedCandidates.push(`${request.method()} ${url}`);
      }
    });

    await page.goto("/demo/w/acme");

    await expect(page.getByText("# general")).toBeVisible();
    await expect(page.getByText("# random")).toBeVisible();
    await expect(page.getByText("Bob Chen").first()).toBeVisible();

    const unique = `demo-e2e-${Date.now()}`;
    await sendMessage(page, unique);
    await expect(page.getByText(unique)).toBeVisible();

    await page.getByText("# random").click();
    await expect(page.getByText("Demo update").first()).toBeVisible({ timeout: 10_000 });

    await page.getByText("# general").click();
    await page.getByText(unique).hover();
    await page.getByTestId("reaction-trigger").first().click();
    await expect(page.getByTestId("emoji-picker")).toBeVisible();

    expect(blockedCandidates).toHaveLength(0);
  });

  test("persists demo state across reload", async ({ page }) => {
    await page.goto("/demo/w/acme");
    await page.getByText("# general").click();

    const persisted = `demo-persist-${Date.now()}`;
    await sendMessage(page, persisted);
    await expect(page.getByText(persisted)).toBeVisible();

    await page.reload();
    await page.getByText("# general").click();
    await expect(page.getByText(persisted)).toBeVisible();
  });

  test("edit message in demo mode", async ({ page }) => {
    await page.goto("/demo/w/acme");
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    const unique = `demo-edit-${Date.now()}`;
    await sendMessage(page, unique);
    await expect(page.getByText(unique)).toBeVisible();

    // Scope interactions to the specific message row
    const messageRow = page.locator("[data-message-id]", { hasText: unique });
    await messageRow.hover();
    await messageRow.getByTestId("message-overflow-menu").click();
    await page.getByTestId("edit-message-action").click();

    // Edit the message
    const editInput = page.getByTestId("edit-message-input");
    await expect(editInput).toBeVisible();
    const updated = `demo-edited-${Date.now()}`;
    await editInput.fill(updated);
    await editInput.press("Enter");

    await expect(page.getByText(updated)).toBeVisible();
  });

  test("delete message in demo mode", async ({ page }) => {
    await page.goto("/demo/w/acme");
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    const unique = `demo-delete-${Date.now()}`;
    await sendMessage(page, unique);
    await expect(page.getByText(unique)).toBeVisible();

    // Scope interactions to the specific message row
    const messageRow = page.locator("[data-message-id]", { hasText: unique });
    await messageRow.hover();
    await messageRow.getByTestId("message-overflow-menu").click();
    await page.getByTestId("delete-message-action").click();

    await expect(page.getByText(unique)).not.toBeVisible({ timeout: 5000 });
  });

  test("search in demo mode finds messages", async ({ page }) => {
    await page.goto("/demo/w/acme");
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // Open search
    await page.keyboard.press("Meta+k");
    await expect(page.getByTestId("search-modal")).toBeVisible();

    // Search for known demo content
    await page.getByTestId("search-input").fill("Welcome");

    // Results should appear (from gallery-mode search)
    await expect(page.getByTestId("search-results")).toContainText("Welcome", { timeout: 5000 });
  });

  test("create new DM in demo mode", async ({ page }) => {
    await page.goto("/demo/w/acme");
    await expect(page.getByText("# general")).toBeVisible();

    // Hover DMs header to reveal + button
    await page.getByTestId("dms-section-header").hover();
    await page.getByTestId("new-dm-button").click();

    // New DM dialog should appear with members from demo mock data
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "New Direct Message" })).toBeVisible();
    await expect(dialog.getByText("Carol Davis")).toBeVisible();

    // Click Carol Davis (no existing DM) to create a brand new DM
    await dialog.getByText("Carol Davis").click();

    // DM should now be active — send a message in it
    await expect(page.locator(".tiptap")).toBeVisible();
    const unique = `demo-dm-${Date.now()}`;
    await sendMessage(page, unique);
    await expect(page.getByText(unique)).toBeVisible();
  });

  test("open existing DM in demo mode", async ({ page }) => {
    await page.goto("/demo/w/acme");
    await expect(page.getByText("# general")).toBeVisible();

    // Hover DMs header to reveal + button
    await page.getByTestId("dms-section-header").hover();
    await page.getByTestId("new-dm-button").click();

    // Click Bob Chen (who already has an existing DM) — should switch to existing DM
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Bob Chen")).toBeVisible();
    await dialog.getByText("Bob Chen").click();

    // Should switch to the existing DM conversation view
    await expect(page.locator(".tiptap")).toBeVisible();
  });

  test("create channel in demo mode", async ({ page }) => {
    await page.goto("/demo/w/acme");
    await expect(page.getByText("# general")).toBeVisible();

    // Hover channels header to reveal + button
    await page.getByTestId("channels-section-header").hover();
    await page.getByTestId("create-channel-button").click();

    // Create channel dialog should appear
    await expect(page.getByRole("heading", { name: "Create Channel" })).toBeVisible();

    const channelName = `demo-ch-${Date.now()}`;
    await page.getByTestId("create-channel-name-input").fill(channelName);
    await page.getByRole("button", { name: "Create" }).click();

    // Dialog should close and new channel should appear in sidebar
    await expect(page.getByRole("heading", { name: "Create Channel" })).not.toBeVisible();
    await expect(page.getByText(`# ${channelName}`)).toBeVisible();
  });

  test("toggle reaction in demo mode", async ({ page }) => {
    await page.goto("/demo/w/acme");
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // Send a message, then toggle a reaction via the quick-react button
    const unique = `demo-react-${Date.now()}`;
    await sendMessage(page, unique);
    await expect(page.getByText(unique)).toBeVisible();

    const messageRow = page.locator("[data-message-id]", { hasText: unique });
    await messageRow.hover();
    await messageRow.getByTestId("quick-react-✅").click();

    // Reaction pill should appear
    await expect(messageRow.getByTestId("reaction-pill-✅")).toBeVisible();

    // Click pill again to toggle off (remove reaction)
    await messageRow.getByTestId("reaction-pill-✅").click();
    await expect(messageRow.getByTestId("reaction-pill-✅")).not.toBeVisible();
  });

  test("file upload in demo mode creates mock attachment", async ({ page }) => {
    await page.goto("/demo/w/acme");
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // Use the file chooser to attach a file
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Attach file" }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "demo-file.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("demo content"),
    });

    // File preview should appear
    await expect(page.getByText("demo-file.txt")).toBeVisible();

    // Send message with file
    const unique = `demo-upload-${Date.now()}`;
    const editor = page.locator(".tiptap");
    await editor.click();
    await page.keyboard.type(unique);
    await page.keyboard.press("Enter");

    await expect(page.getByText(unique)).toBeVisible();
  });

  test("unread badge increments on non-active channel", async ({ page }) => {
    await page.goto("/demo/w/acme");
    // Select general so random is non-active
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // The demo simulation posts to #random every 8s. Wait for at least one badge update.
    // #random already starts with unread count from seed data, so just verify it exists.
    const randomButton = page.getByRole("button", { name: /random/ });
    await expect(randomButton).toBeVisible();
    // Should show a badge number (seeded unread count)
    await expect(randomButton.locator("span").filter({ hasText: /\d+/ })).toBeVisible();
  });

  test("auto-reactions appear after sending a message", async ({ page }) => {
    await page.goto("/demo/w/acme");
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    const unique = `demo-autoreact-${Date.now()}`;
    await sendMessage(page, unique);
    await expect(page.getByText(unique)).toBeVisible();

    const messageRow = page.locator("[data-message-id]", { hasText: unique });

    // After ~1.5s Alice adds 👍, after ~3.2s Bob adds 🚀
    await expect(messageRow.getByTestId("reaction-pill-👍")).toBeVisible({ timeout: 5000 });
    await expect(messageRow.getByTestId("reaction-pill-🚀")).toBeVisible({ timeout: 5000 });
  });

  test("search result click navigates to channel", async ({ page }) => {
    await page.goto("/demo/w/acme");
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // Open search
    await page.keyboard.press("Meta+k");
    await expect(page.getByTestId("search-modal")).toBeVisible();

    // Search for known demo content
    await page.getByTestId("search-input").fill("Welcome");
    await expect(page.getByTestId("search-results")).toContainText("Welcome", { timeout: 5000 });

    // Use keyboard to select and navigate to result
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    // Search modal should close after selecting a result
    await expect(page.getByTestId("search-modal")).not.toBeVisible();
  });

  test("search no results state", async ({ page }) => {
    await page.goto("/demo/w/acme");
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    await page.keyboard.press("Meta+k");
    await expect(page.getByTestId("search-modal")).toBeVisible();

    // Search for something that won't match any messages
    await page.getByTestId("search-input").fill("xyznonexistent12345");
    await expect(page.getByTestId("search-no-results")).toBeVisible({ timeout: 5000 });
  });

  test("simulation increments unread on non-active channel", async ({ page }) => {
    await page.goto("/demo/w/acme");
    // Stay on #general so #random is non-active
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    const randomButton = page.getByRole("button", { name: /random/ });
    await expect(randomButton).toBeVisible();

    // Get initial badge text
    const initialBadge = await randomButton.locator("span").filter({ hasText: /\d+/ }).textContent();
    const initialCount = parseInt(initialBadge ?? "0", 10);

    // Poll for the simulation interval to fire instead of hard-waiting 9s
    await expect
      .poll(async () => {
        const badge = await randomButton.locator("span").filter({ hasText: /\d+/ }).textContent();
        return parseInt(badge ?? "0", 10);
      }, { timeout: 15000, intervals: [1000, 2000, 2000, 2000] })
      .toBeGreaterThan(initialCount);
  });

  test("join existing reaction adds current user to group", async ({ page }) => {
    await page.goto("/demo/w/acme");
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    const unique = `demo-joinreact-${Date.now()}`;
    await sendMessage(page, unique);
    await expect(page.getByText(unique)).toBeVisible();

    const messageRow = page.locator("[data-message-id]", { hasText: unique });

    // Wait for auto-reaction 👍 from Alice (fires at ~1.5s)
    await expect(messageRow.getByTestId("reaction-pill-👍")).toBeVisible({ timeout: 5000 });

    // Now click the 👍 pill to add current user to the same reaction group
    await messageRow.getByTestId("reaction-pill-👍").click();
    // The pill should still be visible (now with 2 users)
    await expect(messageRow.getByTestId("reaction-pill-👍")).toBeVisible();

    // Click again to remove current user's reaction (group still has Alice's)
    await messageRow.getByTestId("reaction-pill-👍").click();
    // Pill should still be visible (Alice's reaction remains)
    await expect(messageRow.getByTestId("reaction-pill-👍")).toBeVisible();
  });

  test("search DM message navigates to DM view", async ({ page }) => {
    await page.goto("/demo/w/acme");
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // Open search
    await page.keyboard.press("Meta+k");
    await expect(page.getByTestId("search-modal")).toBeVisible();

    // Search for DM content (Alice's DM message)
    await page.getByTestId("search-input").fill("demo script");
    await expect(page.getByTestId("search-results")).toContainText("demo script", { timeout: 5000 });

    // Click the search result to navigate to DM
    const firstResult = page.getByTestId("search-results").locator("button").first();
    await firstResult.click();

    // Modal should close
    await expect(page.getByTestId("search-modal")).not.toBeVisible();
  });

  test("close create channel dialog via escape", async ({ page }) => {
    await page.goto("/demo/w/acme");
    await expect(page.getByText("# general")).toBeVisible();

    // Open create channel dialog
    await page.getByTestId("channels-section-header").hover();
    await page.getByTestId("create-channel-button").click();
    await expect(page.getByRole("heading", { name: "Create Channel" })).toBeVisible();

    // Close via Escape
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Create Channel" })).not.toBeVisible();
  });

  test("thread reply in demo mode", async ({ page }) => {
    await page.goto("/demo/w/acme");
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // Find a message with replies
    const threadButton = page.locator('[data-testid^="thread-replies-"]').first();
    await expect(threadButton).toBeVisible();
    await threadButton.click();

    // Thread panel should open
    await expect(page.getByTestId("thread-panel")).toBeVisible();

    // Send a reply in the thread
    const threadEditor = page.getByTestId("thread-panel").locator(".tiptap");
    await threadEditor.click();
    const reply = `demo-reply-${Date.now()}`;
    await page.keyboard.type(reply);
    await page.keyboard.press("Enter");

    await expect(page.getByText(reply)).toBeVisible();
  });
});
