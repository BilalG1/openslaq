import { expect } from "@playwright/test";
import { test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";

/** Wait for Radix dialog to fully clean up (overlay removed + pointer-events restored). */
async function waitForDialogDismissed(page: import("@playwright/test").Page) {
  await page.waitForFunction(() => {
    const htmlStyle = getComputedStyle(document.documentElement).pointerEvents;
    const bodyStyle = getComputedStyle(document.body).pointerEvents;
    return htmlStyle !== "none" && bodyStyle !== "none";
  }, undefined, { timeout: 5000 }).catch(() => {
    // If pointer-events is stuck, force-clear it
  });
  // Force-clear any leftover Radix scroll-lock styles
  await page.evaluate(() => {
    document.documentElement.style.pointerEvents = "";
    document.body.style.pointerEvents = "";
  });
}

/** Open the status dialog from the user dropdown menu. */
async function openStatusDialog(page: import("@playwright/test").Page) {
  const userButtonTrigger = page.locator(".stack-scope").first();
  await userButtonTrigger.click();

  // The status menuitem is the one before "Settings". Get all visible menuitems and click the first one.
  // Since the text can be "Set a status" or "🏠 Working remotely" etc., we match by position.
  // The menu items are: [status item], Settings, Theme: ..., Sign out
  // Find it by looking for the menuitem that is NOT Settings, Theme, or Sign out
  const menuItems = page.getByRole("menuitem");
  const count = await menuItems.count();
  for (let i = 0; i < count; i++) {
    const text = await menuItems.nth(i).textContent();
    if (text && !text.includes("Settings") && !text.includes("Theme") && !text.includes("Sign out")) {
      await menuItems.nth(i).click();
      break;
    }
  }

  await expect(page.getByTestId("set-status-dialog")).toBeVisible();
}

test.describe("User Status", () => {
  // Run serially: all tests share the same mock user, so concurrent status updates
  // from parallel tests create race conditions via socket broadcasts.
  test.describe.configure({ mode: "serial" });
  test("set status from user menu and verify dialog opens", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await expect(page.getByText("# general")).toBeVisible();

    await openStatusDialog(page);

    // Fill in emoji and text
    await page.getByTestId("status-emoji-input").fill("\u{1F3E0}");
    await page.getByTestId("status-text-input").fill("Working remotely");

    // Save
    await page.getByTestId("save-status-button").click();

    // Dialog should close
    await expect(page.getByTestId("set-status-dialog")).not.toBeVisible();
  });

  test("set preset status fills in emoji and text", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await expect(page.getByText("# general")).toBeVisible();

    await openStatusDialog(page);

    // Click "In a meeting" preset
    await page.getByTestId("status-preset-in-a-meeting").click();

    // Verify the fields are pre-filled
    await expect(page.getByTestId("status-emoji-input")).toHaveValue("\u{1F4C5}");
    await expect(page.getByTestId("status-text-input")).toHaveValue("In a meeting");
  });

  test("clear status via dialog", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await expect(page.getByText("# general")).toBeVisible();

    // First set a status
    await openStatusDialog(page);
    await page.getByTestId("status-emoji-input").fill("\u{1F334}");
    await page.getByTestId("status-text-input").fill("Vacationing");
    await page.getByTestId("save-status-button").click();
    await expect(page.getByTestId("set-status-dialog")).not.toBeVisible();
    await waitForDialogDismissed(page);

    // Re-open — the status item should now show "🌴 Vacationing"
    await openStatusDialog(page);

    // Clear status
    await page.getByTestId("clear-status-button").click();
    await expect(page.getByTestId("set-status-dialog")).not.toBeVisible();
  });

  test("status visible in profile sidebar", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await expect(page.getByText("# general")).toBeVisible();

    // Set a status
    await openStatusDialog(page);
    await page.getByTestId("status-emoji-input").fill("\u{1F912}");
    await page.getByTestId("status-text-input").fill("Out sick");
    await page.getByTestId("save-status-button").click();
    await expect(page.getByTestId("set-status-dialog")).not.toBeVisible();
    await waitForDialogDismissed(page);

    // Send a message using the tiptap editor
    await expect(page.locator(".tiptap")).toBeVisible();
    const editor = page.locator(".tiptap");
    await editor.click();
    await page.keyboard.type("Hello to open profile");
    await page.keyboard.press("Enter");

    // Wait for the message to appear
    await expect(page.getByText("Hello to open profile")).toBeVisible();

    // Click on the message author name to open profile sidebar
    const messageItem = page.locator("[data-message-id]").last();
    const authorButton = messageItem.getByRole("button", { name: "Test User" });
    await authorButton.click();

    // Profile sidebar should show the status
    await expect(page.getByTestId("profile-sidebar")).toBeVisible();
    await expect(page.getByTestId("profile-status")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("profile-status")).toContainText("Out sick");
  });
});
