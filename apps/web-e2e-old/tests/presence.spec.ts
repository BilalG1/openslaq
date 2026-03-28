import { expect } from "@playwright/test";
import { sharedTest as test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";

test.describe("Presence indicators", () => {
  test("presence dots appear in DM list", async ({ page, testWorkspace }) => {
    // Create a self-DM so at least one DM entry exists
    await testWorkspace.api.createDm("e2e-test-user-001");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // Wait for DM list to load
    await expect(page.getByText("Test User (you)")).toBeVisible();

    // Presence dot should exist
    const dot = page.getByTestId("presence-e2e-test-user-001");
    await expect(dot).toBeVisible();
  });

  test("own presence dot is green (online via socket)", async ({ page, testWorkspace }) => {
    await testWorkspace.api.createDm("e2e-test-user-001");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    await expect(page.getByText("Test User (you)")).toBeVisible();

    const dot = page.getByTestId("presence-e2e-test-user-001");
    await expect(dot).toBeVisible();

    // The dot should have bg-green-500 class (online)
    await expect(dot).toHaveClass(/bg-green-500/);
  });
});
