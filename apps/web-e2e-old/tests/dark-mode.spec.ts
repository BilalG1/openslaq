import { expect, type Page } from "@playwright/test";
import { test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";

async function openWorkspaceWithRetry(page: Page, workspaceSlug: string) {
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.goto(`/w/${workspaceSlug}`);
    const signInHeading = page.getByRole("heading", { name: "Sign in to your account" });
    if (await signInHeading.isVisible({ timeout: 1500 }).catch(() => false)) {
      await setupMockAuth(page);
      continue;
    }
    const general = page.getByText("# general");
    if (await general.isVisible({ timeout: 10000 }).catch(() => false)) {
      return;
    }
  }
  await expect(page.getByText("# general")).toBeVisible();
}

test.describe("Dark mode", () => {
  test("system default: no .dark class when prefers-color-scheme is light", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await openWorkspaceWithRetry(page, testWorkspace.slug);

    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(hasDark).toBe(false);
  });

  test("toggle theme via localStorage applies .dark class", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);

    // Set dark mode before navigating
    await page.addInitScript(() => {
      localStorage.setItem("openslaq-theme", "dark");
    });

    await openWorkspaceWithRetry(page, testWorkspace.slug);

    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(hasDark).toBe(true);
  });

  test("light mode via localStorage removes .dark class", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);

    await page.addInitScript(() => {
      localStorage.setItem("openslaq-theme", "light");
    });

    await openWorkspaceWithRetry(page, testWorkspace.slug);

    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(hasDark).toBe(false);
  });

  test("theme persists across navigation", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);

    await page.addInitScript(() => {
      localStorage.setItem("openslaq-theme", "dark");
    });

    await openWorkspaceWithRetry(page, testWorkspace.slug);

    // Verify dark mode is active
    let hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(hasDark).toBe(true);

    // Navigate to workspace list
    await page.goto("/");
    await expect(page.getByText("Your Workspaces")).toBeVisible();

    // Verify dark mode is still active
    hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(hasDark).toBe(true);
  });

  test("clicking theme toggle in user menu cycles dark mode on and off", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await openWorkspaceWithRetry(page, testWorkspace.slug);

    // Initially should be light (no .dark class)
    let hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(hasDark).toBe(false);

    // Open UserButton menu and click theme toggle to switch to dark
    const userButtonTrigger = page.locator(".stack-scope").first();
    await userButtonTrigger.click();
    await expect(page.getByText("Theme: Light")).toBeVisible();
    await page.getByText("Theme: Light").click();

    // Should now have .dark class
    hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(hasDark).toBe(true);

    // Wait for the menu to fully close before re-opening
    await expect(page.getByText("Theme: Light")).not.toBeVisible();
    // Small delay for the UserButton popover internal state to reset
    await page.waitForTimeout(500);

    // Re-open menu and cycle back to light
    await userButtonTrigger.click();
    await expect(page.getByText("Theme: Dark")).toBeVisible({ timeout: 5000 });
    await page.getByText("Theme: Dark").click();

    hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(hasDark).toBe(false);
  });

  test("system preference dark: .dark class applied when no stored theme", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);

    // Clear any stored theme and emulate dark system preference
    await page.addInitScript(() => {
      localStorage.removeItem("openslaq-theme");
    });
    await page.emulateMedia({ colorScheme: "dark" });

    await openWorkspaceWithRetry(page, testWorkspace.slug);

    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(hasDark).toBe(true);
  });
});
