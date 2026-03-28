import { expect } from "@playwright/test";
import { sharedTest as test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";
import { SECOND_USER } from "./helpers/api";

test.describe("Invite flow", () => {
  test("user can accept an invite and join a workspace", async ({ page, testWorkspace }) => {
    // Create invite via API as workspace owner
    const invite = await testWorkspace.api.createInvite();

    // Set up second user auth
    await setupMockAuth(page, {
      id: SECOND_USER.userId,
      displayName: SECOND_USER.displayName,
      email: SECOND_USER.email,
    });

    // Visit invite link
    await page.goto(`/invite/${invite.code}`);

    // Should see workspace name and accept button
    await expect(page.getByText(testWorkspace.name, { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Accept Invite" })).toBeVisible();

    // Click accept
    await page.getByRole("button", { name: "Accept Invite" }).click();

    // Should be redirected to the workspace
    await page.waitForURL(`**/w/${testWorkspace.slug}*`, { timeout: 10000 });
  });

  test("invalid invite code shows error", async ({ page, testWorkspace: _testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto("/invite/nonexistent-code-123");

    await expect(page.getByText("Invalid Invite")).toBeVisible();
    await expect(page.getByText("Invite not found")).toBeVisible();
  });
});
