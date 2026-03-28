import { expect, type Page } from "@playwright/test";
import { test, addMemberViaInvite } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";
import { SECOND_USER, SHOWCASE_CAROL } from "./helpers/api";

async function navigateToWorkspace(page: Page, workspaceSlug: string) {
  await page.addInitScript(() => localStorage.removeItem("openslaq-sidebar-collapse"));
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto(`/w/${workspaceSlug}`);
    const signInHeading = page.getByRole("heading", { name: "Sign in to your account" });
    if (await signInHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
      await setupMockAuth(page);
      continue;
    }
    break;
  }
  // Wait for channels to load
  await expect(page.getByRole("button", { name: "# general" })).toBeVisible({ timeout: 30000 });
}

test.describe("Group DMs", () => {
  test("multi-select in New DM dialog creates group DM visible in sidebar", async ({ page, testWorkspace }) => {
    // Add second and third users to workspace
    await addMemberViaInvite(testWorkspace.api, SECOND_USER, testWorkspace.slug);
    await addMemberViaInvite(testWorkspace.api, SHOWCASE_CAROL, testWorkspace.slug);

    await setupMockAuth(page);
    await navigateToWorkspace(page, testWorkspace.slug);

    // Open the DMs section header to ensure it's expanded, then click the + button
    const dmsHeader = page.getByTestId("dms-section-header");
    await dmsHeader.hover();
    await page.getByTestId("new-dm-button").click();

    // Wait for the dialog to appear and members to load
    await expect(page.getByText("New Direct Message")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId(`dm-member-${SECOND_USER.userId}`)).toBeVisible({ timeout: 10000 });

    // Select two members (the second and third users)
    await page.getByTestId(`dm-member-${SECOND_USER.userId}`).click();
    await page.getByTestId(`dm-member-${SHOWCASE_CAROL.userId}`).click();

    // Should show selected chips
    await expect(page.getByTestId("selected-members")).toBeVisible();

    // The "Go" button should say "Start Group DM"
    const goButton = page.getByTestId("dm-go-button");
    await expect(goButton).toContainText("Start Group DM");

    // Wait for group DM API response after clicking Go
    const groupDmCreated = page.waitForResponse(
      (res) => res.url().includes("/group-dm") && res.request().method() === "POST",
    );
    await goButton.click();
    await groupDmCreated;

    // After creating the group DM, the header should show the group DM name with member count
    await expect(page.getByTestId("group-dm-member-count")).toBeVisible({ timeout: 10000 });
  });

  test("single-select in New DM dialog still creates 1:1 DM", async ({ page, testWorkspace }) => {
    await addMemberViaInvite(testWorkspace.api, SECOND_USER, testWorkspace.slug);

    await setupMockAuth(page);
    await navigateToWorkspace(page, testWorkspace.slug);

    // Open New DM dialog
    const dmsHeader = page.getByTestId("dms-section-header");
    await dmsHeader.hover();
    await page.getByTestId("new-dm-button").click();

    await expect(page.getByText("New Direct Message")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId(`dm-member-${SECOND_USER.userId}`)).toBeVisible({ timeout: 10000 });

    // Select only one member
    await page.getByTestId(`dm-member-${SECOND_USER.userId}`).click();

    // The "Go" button should just say "Go" (not "Start Group DM")
    const goButton = page.getByTestId("dm-go-button");
    await expect(goButton).toHaveText("Go");
    await goButton.click();

    // Should navigate to 1:1 DM (DM header should show user name)
    await expect(page.getByRole("heading", { name: "Second User" })).toBeVisible({ timeout: 10000 });
  });

  test("send message in group DM", async ({ page, testWorkspace }) => {
    // Create group DM via API
    await addMemberViaInvite(testWorkspace.api, SECOND_USER, testWorkspace.slug);
    await addMemberViaInvite(testWorkspace.api, SHOWCASE_CAROL, testWorkspace.slug);
    const gdm = await testWorkspace.api.createGroupDm([SECOND_USER.userId, SHOWCASE_CAROL.userId]);

    await setupMockAuth(page);
    await navigateToWorkspace(page, testWorkspace.slug);

    // Click the group DM in sidebar
    const groupDmButton = page.getByTestId(`group-dm-${gdm.channel.id}`);
    await expect(groupDmButton).toBeVisible({ timeout: 10000 });
    await groupDmButton.click();

    // Verify the header shows the group DM name and member count
    await expect(page.getByTestId("group-dm-member-count")).toBeVisible({ timeout: 10000 });

    // Wait for editor to be ready
    const editor = page.locator(".tiptap");
    await expect(editor).toBeVisible({ timeout: 10000 });
    await editor.click();

    // Send a message
    const msgContent = `group-dm-test-${Date.now()}`;
    const sent = page.waitForResponse(
      (res) => res.url().includes("/messages") && res.request().method() === "POST" && res.status() === 201,
    );
    await page.keyboard.type(msgContent);
    await page.keyboard.press("Enter");
    await sent;

    // Message should appear in the message list
    await expect(page.getByText(msgContent)).toBeVisible({ timeout: 10000 });
  });
});
