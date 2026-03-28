import { expect } from "@playwright/test";
import { test, createSecondUserApi } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";
import { openWorkspaceSettings } from "./helpers/chat-ui";
import { SECOND_USER } from "./helpers/api";

test.describe("Member roles", () => {
  test("owner sees Settings link in sidebar dropdown", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // Open dropdown
    await page.locator("button", { hasText: testWorkspace.name }).first().click();
    await expect(page.getByText("Settings")).toBeVisible();
  });

  test("member does not see Settings link", async ({ page, testWorkspace }) => {
    // Add second user as member via invite
    const invite = await testWorkspace.api.createInvite();
    const secondApi = createSecondUserApi(testWorkspace.slug, SECOND_USER);
    await secondApi.acceptInvite(invite.code);

    await setupMockAuth(page, {
      id: SECOND_USER.userId,
      displayName: SECOND_USER.displayName,
      email: SECOND_USER.email,
    });
    await page.goto(`/w/${testWorkspace.slug}`);

    // Open dropdown
    await page.locator("button", { hasText: testWorkspace.name }).first().click();
    await expect(page.getByText("Settings")).not.toBeVisible();
  });

  test("owner sees Invite People in workspace dropdown", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await expect(page.getByText("# general")).toBeVisible();

    // Open workspace dropdown
    await page.locator("button", { hasText: testWorkspace.name }).first().click();
    await expect(page.getByRole("menuitem", { name: "Invite People" })).toBeVisible();
  });

  test("settings dialog shows member list with role badges", async ({ page, testWorkspace }) => {
    // Add a member
    const invite = await testWorkspace.api.createInvite();
    const secondApi = createSecondUserApi(testWorkspace.slug, SECOND_USER);
    await secondApi.acceptInvite(invite.code);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await openWorkspaceSettings(page, testWorkspace.name);

    await expect(page.getByTestId(`role-badge-e2e-test-user-001`)).toHaveText("owner");
    await expect(page.getByTestId(`role-badge-${SECOND_USER.userId}`)).toHaveText("member");
  });

  test("owner can change a member's role", async ({ page, testWorkspace }) => {
    // Add a member
    const invite = await testWorkspace.api.createInvite();
    const secondApi = createSecondUserApi(testWorkspace.slug, SECOND_USER);
    await secondApi.acceptInvite(invite.code);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await openWorkspaceSettings(page, testWorkspace.name);

    // Find role select for the member and change to admin
    const trigger = page.getByTestId(`role-select-${SECOND_USER.userId}`);
    await trigger.waitFor();
    await trigger.click();
    await page.getByRole("option", { name: "admin" }).click();

    // Verify the role badge updated
    await expect(page.getByTestId(`role-badge-${SECOND_USER.userId}`)).toHaveText("admin");
  });

  test("owner can remove a member", async ({ page, testWorkspace }) => {
    // Add a member
    const invite = await testWorkspace.api.createInvite();
    const secondApi = createSecondUserApi(testWorkspace.slug, SECOND_USER);
    await secondApi.acceptInvite(invite.code);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await openWorkspaceSettings(page, testWorkspace.name);

    // Accept the confirm dialog
    page.on("dialog", (dialog) => dialog.accept());

    const removeBtn = page.getByTestId(`remove-btn-${SECOND_USER.userId}`);
    await removeBtn.waitFor();
    await removeBtn.click();

    // Verify member is gone
    await expect(page.getByTestId(`member-row-${SECOND_USER.userId}`)).not.toBeVisible();
  });

  test("role update failure shows error", async ({ page, testWorkspace }) => {
    const invite = await testWorkspace.api.createInvite();
    const secondApi = createSecondUserApi(testWorkspace.slug, SECOND_USER);
    await secondApi.acceptInvite(invite.code);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await openWorkspaceSettings(page, testWorkspace.name);

    await page.route(`**/api/workspaces/${testWorkspace.slug}/members/${SECOND_USER.userId}/role`, async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Role update failed" }),
        });
        return;
      }
      await route.continue();
    });

    const trigger = page.getByTestId(`role-select-${SECOND_USER.userId}`);
    await trigger.waitFor();
    await trigger.click();
    await page.getByRole("option", { name: "admin" }).click();

    await expect(page.getByText("Role update failed")).toBeVisible();
  });

  test("remove member failure shows error", async ({ page, testWorkspace }) => {
    const invite = await testWorkspace.api.createInvite();
    const secondApi = createSecondUserApi(testWorkspace.slug, SECOND_USER);
    await secondApi.acceptInvite(invite.code);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await openWorkspaceSettings(page, testWorkspace.name);

    await page.route(`**/api/workspaces/${testWorkspace.slug}/members/${SECOND_USER.userId}`, async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Remove member failed" }),
        });
        return;
      }
      await route.continue();
    });

    page.on("dialog", (dialog) => dialog.accept());
    await page.getByTestId(`remove-btn-${SECOND_USER.userId}`).click();

    await expect(page.getByText("Remove member failed")).toBeVisible();
  });

  test("owner can delete workspace", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await openWorkspaceSettings(page, testWorkspace.name);

    // Wait for the delete section
    await expect(page.getByRole("heading", { name: "Delete Workspace" })).toBeVisible();

    const confirmInput = page.getByTestId("delete-workspace-input");
    await confirmInput.waitFor();
    const workspaceName = await confirmInput.getAttribute("placeholder");

    // The delete button should be disabled before confirmation
    await expect(page.getByTestId("delete-workspace-btn")).toBeDisabled();

    // Type the workspace name to enable the delete button
    await confirmInput.fill(workspaceName!);
    await expect(page.getByTestId("delete-workspace-btn")).toBeEnabled();

    // Click delete
    await page.getByTestId("delete-workspace-btn").click();

    // Should redirect to the workspace list page
    await expect(page.getByText("Your Workspaces")).toBeVisible({ timeout: 10000 });
  });

  test("delete workspace failure shows error and dialog stays open", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await openWorkspaceSettings(page, testWorkspace.name);
    await expect(page.getByRole("heading", { name: "Delete Workspace" })).toBeVisible();

    await page.route(`**/api/workspaces/${testWorkspace.slug}`, async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Delete workspace failed" }),
        });
        return;
      }
      await route.continue();
    });

    const confirmInput = page.getByTestId("delete-workspace-input");
    const workspaceName = await confirmInput.getAttribute("placeholder");
    await confirmInput.fill(workspaceName!);
    const deleteResponse = page.waitForResponse(
      (res) => res.url().includes(`/api/workspaces/${testWorkspace.slug}`) && res.request().method() === "DELETE",
    );
    await page.getByTestId("delete-workspace-btn").click();
    await deleteResponse;

    await expect(page.getByText("Delete workspace failed")).toBeVisible();
    // Dialog should still be open
    await expect(page.getByRole("heading", { name: "Workspace Settings" })).toBeVisible();
  });
});
