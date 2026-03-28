import { expect, type Page } from "@playwright/test";
import { test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";

async function openWorkspaceListWithRetry(page: Page) {
  const workspacesLoaded = () =>
    page.waitForResponse(
      (res) =>
        res.url().includes("/api/workspaces") &&
        res.request().method() === "GET" &&
        (res.status() === 200 || res.status() === 500),
    );
  for (let attempt = 0; attempt < 2; attempt++) {
    const loaded = workspacesLoaded();
    await page.goto("/");
    await loaded;
    const signInHeading = page.getByRole("heading", { name: "Sign in to your account" });
    if (await signInHeading.isVisible({ timeout: 1500 }).catch(() => false)) {
      await setupMockAuth(page);
      continue;
    }
    const createLink = page.getByTestId("create-workspace-link");
    if (await createLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      return;
    }
  }
  await expect(page.getByText("Your Workspaces")).toBeVisible();
}

test.describe("Workspace creation", () => {
  test("create workspace from dedicated page", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);

    // Navigate to the workspace list page
    await openWorkspaceListWithRetry(page);
    await expect(page.getByText("Your Workspaces")).toBeVisible();

    // The seeded test workspace should appear as a card
    await expect(page.getByTestId(`workspace-card-${testWorkspace.slug}`)).toBeVisible();

    // Click create workspace CTA
    await page.getByTestId("create-workspace-link").first().click();
    await page.waitForURL("**/create-workspace**");

    // Fill in only the name
    const newName = `New Workspace ${Date.now()}`;
    await page.getByTestId("workspace-name-input").fill(newName);

    // Submit the form
    const created = page.waitForResponse(
      (res) => res.url().includes("/workspaces") && res.request().method() === "POST" && res.status() === 201,
    );
    await page.getByTestId("create-workspace-submit").click();
    await created;

    // Should navigate to the new workspace (slug is auto-generated)
    await page.waitForURL("**/w/**", { timeout: 10000 });
  });

  test("workspace list shows existing workspaces as cards", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await openWorkspaceListWithRetry(page);
    await expect(page.getByText("Your Workspaces")).toBeVisible();
    await expect(page.getByText("Get the desktop app for a better experience.")).not.toBeVisible();

    // The test workspace should be rendered as a clickable card
    const wsCard = page.getByTestId(`workspace-card-${testWorkspace.slug}`);
    await expect(wsCard).toBeVisible();

    // Click it to navigate
    await wsCard.click();
    await page.waitForURL(`**/w/${testWorkspace.slug}**`, { timeout: 10000 });
  });

  test("workspace list load failure shows error", async ({ page, testWorkspace: _testWorkspace }) => {
    await setupMockAuth(page);
    await page.route("**/api/workspaces", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Workspaces load failed" }),
        });
        return;
      }
      await route.continue();
    });

    for (let attempt = 0; attempt < 2; attempt++) {
      const loaded = page.waitForResponse(
        (res) =>
          res.url().includes("/api/workspaces") && res.request().method() === "GET" && res.status() === 500,
      );
      await page.goto("/");
      await loaded;
      const signInHeading = page.getByRole("heading", { name: "Sign in to your account" });
      if (await signInHeading.isVisible({ timeout: 1500 }).catch(() => false)) {
        await setupMockAuth(page);
        continue;
      }
      break;
    }
    await expect(page.getByText("Workspaces load failed")).toBeVisible();
  });

  test("workspace creation failure shows error on create page", async ({ page, testWorkspace: _testWorkspace }) => {
    await setupMockAuth(page);

    // Navigate to create workspace page
    await page.goto("/create-workspace");

    // Wait for the page to load
    await expect(page.getByTestId("workspace-name-input")).toBeVisible({ timeout: 10000 });

    await page.getByTestId("workspace-name-input").fill(`Fail Workspace ${Date.now()}`);

    await page.route("**/api/workspaces", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Create workspace failed" }),
        });
        return;
      }
      await route.continue();
    });

    await page.getByTestId("create-workspace-submit").click();
    await expect(page.getByText("Create workspace failed")).toBeVisible();
  });
});
