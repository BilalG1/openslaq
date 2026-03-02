import { expect } from "@playwright/test";
import { test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";

test.describe("Slash Commands", () => {
  test("typing / shows command autocomplete", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // Wait for channel to load
    await expect(page.getByText("#general")).toBeVisible();
    await page.getByText("#general").click();

    // Focus the editor and type /
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    await editor.pressSequentially("/");

    // Autocomplete should appear with built-in commands
    await expect(page.getByTestId("slash-command-list")).toBeVisible({ timeout: 10_000 });

    // Verify command names are shown (use role selector to avoid matching usage hints)
    const list = page.getByTestId("slash-command-list");
    await expect(list.getByRole("button", { name: /\/status/ })).toBeVisible();
    await expect(list.getByRole("button", { name: /\/mute/ })).toBeVisible();
    await expect(list.getByRole("button", { name: /\/remind/ })).toBeVisible();
  });

  test("selecting /mute executes command and shows ephemeral", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // Wait for channel to load
    await expect(page.getByText("#general")).toBeVisible();
    await page.getByText("#general").click();

    // Focus the editor and type /mute
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    await editor.pressSequentially("/mute");

    // Wait for autocomplete to appear
    await expect(page.getByTestId("slash-command-list")).toBeVisible({ timeout: 10_000 });

    // Press Enter to select the mute command from autocomplete
    await page.keyboard.press("Enter");

    // Autocomplete should close after selection
    await expect(page.getByTestId("slash-command-list")).not.toBeVisible({ timeout: 3_000 });

    // Press Enter again to submit the command
    await page.keyboard.press("Enter");

    // Ephemeral message should appear
    await expect(page.getByTestId("ephemeral-message")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("muted")).toBeVisible();
    await expect(page.getByText("Only visible to you")).toBeVisible();
  });

  test("typing /status with args and submitting sets status", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // Wait for channel to load
    await expect(page.getByText("#general")).toBeVisible();
    await page.getByText("#general").click();

    // Type /status to trigger autocomplete
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    await editor.pressSequentially("/status");

    // Wait for autocomplete, select /status
    await expect(page.getByTestId("slash-command-list")).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press("Enter");

    // Wait for autocomplete to close
    await expect(page.getByTestId("slash-command-list")).not.toBeVisible({ timeout: 3_000 });

    // Type the status text after selection (editor should now have "/status ")
    await editor.pressSequentially("Working remotely");

    // Submit the command
    await page.keyboard.press("Enter");

    // Ephemeral message should confirm status was set
    await expect(page.getByTestId("ephemeral-message")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Status set to")).toBeVisible();
  });

  test("filtering narrows command list", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // Wait for channel to load
    await expect(page.getByText("#general")).toBeVisible();
    await page.getByText("#general").click();

    // Type /un to filter to unmute
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    await editor.pressSequentially("/un");

    // Autocomplete should show only unmute
    const list = page.getByTestId("slash-command-list");
    await expect(list).toBeVisible({ timeout: 10_000 });
    await expect(list.getByRole("button", { name: /\/unmute/ })).toBeVisible();

    // Mute and status commands should not be visible in the filtered list
    await expect(list.getByRole("button", { name: /\/status/ })).not.toBeVisible();
  });
});
