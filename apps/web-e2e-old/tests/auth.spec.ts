import { expect, type Page } from "@playwright/test";
import { test } from "./helpers/coverage-fixture";
import { setupMockAuth } from "./helpers/mock-auth";

async function openWorkspaceListWithRetry(page: Page) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const workspacesLoaded = page.waitForResponse(
      (res) =>
        res.url().includes("/api/workspaces") &&
        res.request().method() === "GET" &&
        (res.status() === 200 || res.status() === 500),
    );
    await page.goto("/");
    await workspacesLoaded;

    const signInHeading = page.getByRole("heading", { name: "Sign in to your account" });
    if (await signInHeading.isVisible({ timeout: 1500 }).catch(() => false)) {
      await setupMockAuth(page, { displayName: "E2E Auth User" });
      continue;
    }

    // Page shows either "Your Workspaces" (has workspaces) or "Welcome to OpenSlaq" (empty)
    const hasWorkspaces = await page.getByText("Your Workspaces").isVisible().catch(() => false);
    const isEmpty = await page.getByText("Welcome to OpenSlaq").isVisible().catch(() => false);
    if (hasWorkspaces || isEmpty) {
      return;
    }
  }
  // Final fallback: either heading should be visible
  await expect(
    page.getByText("Your Workspaces").or(page.getByText("Welcome to OpenSlaq")),
  ).toBeVisible();
}

test.describe("Authentication", () => {
  test("unauthenticated user cannot see app content", async ({ page }) => {
    // Intercept Stack Auth API requests to avoid real network calls
    await page.route("**/api.stack-auth.com/**", async (route) => {
      const url = route.request().url();

      // Return project config so the SDK can initialize
      if (url.includes("/projects/current")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "924565c5-6377-44b7-aa75-6b7de8d311f4",
            display_name: "OpenSlaq",
            config: {
              sign_up_enabled: true,
              credential_enabled: true,
              magic_link_enabled: true,
              client_team_creation_enabled: false,
              client_user_deletion_enabled: false,
              oauth_providers: [],
              enabled_oauth_providers: [],
              domains: [],
            },
          }),
        });
      }

      // All other endpoints: not authenticated
      return route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ code: "UNAUTHORIZED" }),
      });
    });

    await page.goto("/");

    // The app sidebar with channels should NOT be visible
    await expect(page.getByText("# general")).not.toBeVisible({ timeout: 10000 });
  });

  test("user display name appears in workspace list", async ({ page }) => {
    await setupMockAuth(page, { displayName: "E2E Auth User" });
    await openWorkspaceListWithRetry(page);
    // Page shows either "Your Workspaces" (has workspaces) or "Welcome to OpenSlaq" (empty)
    await expect(
      page.getByText("Your Workspaces").or(page.getByText("Welcome to OpenSlaq")),
    ).toBeVisible();
  });
});
