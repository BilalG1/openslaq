import { expect, type Page } from "@playwright/test";
import { test, addMemberViaInvite } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";
import { openWorkspaceSettings } from "./helpers/chat-ui";
import { SECOND_USER } from "./helpers/api";

async function openGeneralChannel(page: Page, workspaceSlug: string) {
  // Clear sidebar collapse state that may persist from other tests in same worker
  await page.addInitScript(() => localStorage.removeItem("openslaq-sidebar-collapse"));

  // Navigate and handle auth redirect if needed (retry only for auth)
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto(`/w/${workspaceSlug}`);
    const signInHeading = page.getByRole("heading", { name: "Sign in to your account" });
    if (await signInHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
      await setupMockAuth(page);
      continue;
    }
    break;
  }

  // Wait generously for channels to load (under parallel test load, API can be slow)
  const generalButton = page.getByRole("button", { name: "# general" });
  await expect(generalButton).toBeVisible({ timeout: 30000 });
  await generalButton.click();
}

async function ensureMessageVisible(page: Page, workspaceSlug: string, text: string) {
  await expect
    .poll(
      async () => {
        const message = page.getByText(text);
        if (await message.isVisible().catch(() => false)) return true;
        await openGeneralChannel(page, workspaceSlug);
        return message.isVisible().catch(() => false);
      },
      { timeout: 15000, intervals: [250, 500, 1000] },
    )
    .toBe(true);
}

test.describe("User Profile Sidebar", () => {
  test("click message avatar opens profile sidebar", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const ts = Date.now();
    const msg = await testWorkspace.api.createMessage(channel.id, `profile-avatar-${ts}`);

    await setupMockAuth(page);
    await openGeneralChannel(page, testWorkspace.slug);
    await expect(page.getByText(`profile-avatar-${ts}`)).toBeVisible();

    // Click the avatar button (has data-testid)
    await page.getByTestId(`message-avatar-${msg.id}`).click();

    await expect(page.getByTestId("profile-sidebar")).toBeVisible();
  });

  test("click message username opens profile sidebar", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const ts = Date.now();
    await testWorkspace.api.createMessage(channel.id, `profile-name-${ts}`);

    await setupMockAuth(page);
    await openGeneralChannel(page, testWorkspace.slug);
    await expect(page.getByText(`profile-name-${ts}`)).toBeVisible();

    // Click the display name button
    const messageRow = page.locator(`[data-message-id]`).filter({ hasText: `profile-name-${ts}` });
    const nameBtn = messageRow.locator("button", { hasText: "Test User" });
    await nameBtn.waitFor();
    await nameBtn.click();

    await expect(page.getByTestId("profile-sidebar")).toBeVisible();
  });

  test("profile displays user details", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const ts = Date.now();
    await testWorkspace.api.createMessage(channel.id, `profile-details-${ts}`);

    await setupMockAuth(page);
    await openGeneralChannel(page, testWorkspace.slug);
    await expect(page.getByText(`profile-details-${ts}`)).toBeVisible();

    // Open profile
    const messageRow = page.locator(`[data-message-id]`).filter({ hasText: `profile-details-${ts}` });
    const nameBtn = messageRow.locator("button", { hasText: "Test User" });
    await nameBtn.waitFor();
    await nameBtn.click();

    await expect(page.getByTestId("profile-sidebar")).toBeVisible();
    await expect(page.getByTestId("profile-display-name")).toContainText("Test User");
    await expect(page.getByTestId("profile-email")).toContainText("test@openslaq.dev");
    await expect(page.getByTestId("profile-role")).toBeVisible();
    await expect(page.getByTestId("profile-presence")).toBeVisible();
  });

  test("close button dismisses profile sidebar", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const ts = Date.now();
    await testWorkspace.api.createMessage(channel.id, `profile-close-${ts}`);

    await setupMockAuth(page);
    await openGeneralChannel(page, testWorkspace.slug);
    await ensureMessageVisible(page, testWorkspace.slug, `profile-close-${ts}`);

    // Open profile (retry click if sidebar doesn't appear — avoids flakiness
    // from React re-renders detaching the button between waitFor and click)
    const messageRow = page.locator(`[data-message-id]`).filter({ hasText: `profile-close-${ts}` });
    await expect(async () => {
      await messageRow.locator("button", { hasText: "Test User" }).click();
      await expect(page.getByTestId("profile-sidebar")).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 15000 });

    // Close profile
    await page.getByTestId("profile-close").click();
    await expect(page.getByTestId("profile-sidebar")).not.toBeVisible();
  });

  test("profile replaces thread panel", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const ts = Date.now();
    const parentText = `profile-vs-thread-${ts}`;
    const msg = await testWorkspace.api.createMessage(channel.id, parentText);
    await testWorkspace.api.createThreadReply(channel.id, msg.id, `thread-reply-${ts}`);

    await setupMockAuth(page);
    await openGeneralChannel(page, testWorkspace.slug);
    await ensureMessageVisible(page, testWorkspace.slug, parentText);

    // Hover message to reveal action bar, then click reply
    await expect
      .poll(
        async () => {
          const text = page.getByText(parentText);
          if (!(await text.isVisible().catch(() => false))) return false;
          await text.hover();
          await page.getByTestId("reply-action-trigger").click();
          return page.getByTestId("thread-panel").isVisible().catch(() => false);
        },
        { timeout: 10000, intervals: [250, 500, 1000] },
      )
      .toBe(true);

    // Click avatar in main list (not thread panel) to open profile — should replace thread
    await page.getByTestId(`message-avatar-${msg.id}`).first().click();

    await expect(page.getByTestId("profile-sidebar")).toBeVisible();
    await expect(page.getByTestId("thread-panel")).not.toBeVisible();
  });

  test("opening thread closes profile sidebar", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const ts = Date.now();
    await testWorkspace.api.createMessage(channel.id, `thread-closes-profile-${ts}`);

    await setupMockAuth(page);
    await openGeneralChannel(page, testWorkspace.slug);
    await expect(page.getByText(`thread-closes-profile-${ts}`)).toBeVisible();

    // Open profile
    const messageRow = page.locator(`[data-message-id]`).filter({ hasText: `thread-closes-profile-${ts}` });
    const nameBtn = messageRow.locator("button", { hasText: "Test User" });
    await nameBtn.waitFor();
    await nameBtn.click();
    await expect(page.getByTestId("profile-sidebar")).toBeVisible();

    // Close profile, then open thread via hover action bar
    await page.getByTestId("profile-close").click();
    await page.getByText(`thread-closes-profile-${ts}`).hover();
    await page.getByTestId("reply-action-trigger").click();

    await expect(page.getByTestId("thread-panel")).toBeVisible();
    await expect(page.getByTestId("profile-sidebar")).not.toBeVisible();
  });

  test("send message button creates DM and closes sidebar", async ({ page, testWorkspace }) => {
    // Add a second user to the workspace
    const secondUserApi = await addMemberViaInvite(testWorkspace.api, SECOND_USER, testWorkspace.slug);

    // Second user sends a message
    const channel = await secondUserApi.getChannelByName("general");
    const ts = Date.now();
    await secondUserApi.createMessage(channel.id, `dm-profile-${ts}`);

    // Log in as default user
    await setupMockAuth(page);
    await openGeneralChannel(page, testWorkspace.slug);
    await expect(page.getByText(`dm-profile-${ts}`)).toBeVisible();

    // Open second user's profile
    const messageRow = page.locator(`[data-message-id]`).filter({ hasText: `dm-profile-${ts}` });
    await messageRow.locator("button", { hasText: SECOND_USER.displayName }).click();

    await expect(page.getByTestId("profile-sidebar")).toBeVisible();
    await expect(page.getByTestId("profile-send-message")).toBeVisible();

    // Click send message
    await page.getByTestId("profile-send-message").click();

    // Profile sidebar should close and DM should open
    await expect(page.getByTestId("profile-sidebar")).not.toBeVisible();
    // DM header should show the second user's name (use heading to be specific)
    await expect(page.getByRole("heading", { name: SECOND_USER.displayName })).toBeVisible();
  });

  test("send message button hidden for own profile", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const ts = Date.now();
    await testWorkspace.api.createMessage(channel.id, `own-profile-${ts}`);

    await setupMockAuth(page);
    await openGeneralChannel(page, testWorkspace.slug);
    await expect(page.getByText(`own-profile-${ts}`)).toBeVisible();

    // Open own profile (retry click if sidebar doesn't appear — avoids flakiness
    // from React re-renders detaching the button between waitFor and click)
    const messageRow = page.locator(`[data-message-id]`).filter({ hasText: `own-profile-${ts}` });
    await expect(async () => {
      await messageRow.locator("button", { hasText: "Test User" }).click();
      await expect(page.getByTestId("profile-sidebar")).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 15000 });
    await expect(page.getByTestId("profile-display-name")).toContainText("Test User");

    // Send message button should NOT be visible
    await expect(page.getByTestId("profile-send-message")).not.toBeVisible();
  });

  test("member click in workspace settings dialog opens profile", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await openWorkspaceSettings(page, testWorkspace.slug);

    // Click the display name in the member row
    const memberRow = page.getByTestId(`member-row-e2e-test-user-001`);
    const nameBtn = memberRow.locator("button", { hasText: "Test User" });
    await nameBtn.waitFor();
    await nameBtn.click();

    // Dialog should close and profile should show
    await expect(page.getByTestId("profile-sidebar")).toBeVisible();
    await expect(page.getByTestId("profile-display-name")).toContainText("Test User");
  });
});
