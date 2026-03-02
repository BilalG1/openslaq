import { expect } from "@playwright/test";
import { sharedTest as test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";

test.describe("Home page (authenticated)", () => {
  test("renders sidebar with channels and messages area", async ({ page, testWorkspace }) => {
    await setupMockAuth(page, { displayName: "Alice Johnson" });

    await page.goto(`/w/${testWorkspace.slug}`);

    // Wait for workspace bootstrap to complete (channels loaded + auto-selected)
    await expect(page.getByText("# general")).toBeVisible({ timeout: 20_000 });

    // Sidebar header
    await expect(page.getByText("OpenSlaq")).toBeVisible();

    // User display name in sidebar
    await expect(page.getByText("Alice Johnson")).toBeVisible();

    // Seeded channels appear
    await expect(page.getByText("# random")).toBeVisible();

    // #general is auto-selected on load — message input should be visible
    await expect(page.locator('[contenteditable="true"]').first()).toBeVisible();

    await page.screenshot({ path: "test-results/home-authenticated.png" });
  });

  test("can switch between channels", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);

    await page.goto(`/w/${testWorkspace.slug}`);

    // Wait for channels to load
    await expect(page.getByText("# general")).toBeVisible();

    // Click general
    await page.getByText("# general").click();
    await expect(page.getByText("general").first()).toBeVisible();

    // Switch to random
    await page.getByText("# random").click();
    await expect(page.getByText("random").first()).toBeVisible();
  });

  test("sidebar dropdown: 'All workspaces' navigates to workspace list", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // Open the workspace dropdown
    await page.locator("button", { hasText: testWorkspace.name }).first().click();
    await expect(page.getByText("All workspaces")).toBeVisible();

    // Click "All workspaces"
    await page.getByText("All workspaces").click();
    await page.waitForURL("**/", { timeout: 10_000 });

    // Should be on the workspace list page
    await expect(page.getByText("Your Workspaces")).toBeVisible();
  });

  test("sidebar dropdown: 'Settings' opens settings dialog", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // Open the workspace dropdown
    await page.locator("button", { hasText: testWorkspace.name }).first().click();
    await expect(page.getByText("Settings")).toBeVisible();

    // Click "Settings"
    await page.getByText("Settings").click();

    // Should see the settings dialog
    await expect(page.getByRole("heading", { name: "Workspace Settings" })).toBeVisible();
    await expect(page.getByText(/^Members \(\d+\)$/)).toBeVisible();
  });
});
