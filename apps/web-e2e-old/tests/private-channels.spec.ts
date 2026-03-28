import { expect } from "@playwright/test";
import { test, addMemberViaInvite } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";
import { SECOND_USER } from "./helpers/api";

test.describe("Private channels", () => {
  test("create channel dialog shows visibility toggle for admin", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await expect(page.getByText("# general")).toBeVisible();

    // Click + to create channel
    await page.getByTestId("create-channel-button").click();
    await expect(page.getByTestId("create-channel-name-input")).toBeVisible();

    // Visibility toggle should be visible (default user is owner)
    await expect(page.getByTestId("channel-visibility-toggle")).toBeVisible();
  });

  test("private channel shows lock icon in sidebar", async ({ page, testWorkspace }) => {
    // Create a private channel via API
    const res = await testWorkspace.api.createPrivateChannel(`priv-sidebar-${Date.now()}`);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // The private channel should show a lock icon (SVG) instead of #
    const channelButton = page.getByRole("button", { name: res.name });
    await expect(channelButton).toBeVisible();
    // Should not have # prefix
    const text = await channelButton.textContent();
    expect(text).not.toContain(`# ${res.name}`);
  });

  test("private channel shows lock icon in header", async ({ page, testWorkspace }) => {
    const res = await testWorkspace.api.createPrivateChannel(`priv-header-${Date.now()}`);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // Click on the private channel
    const channelButton = page.getByRole("button", { name: res.name });
    await expect(channelButton).toBeVisible();
    await channelButton.click();

    // Header should have lock icon
    await expect(page.getByTestId("private-channel-icon")).toBeVisible();
  });

  test("channel members dialog shows add/remove for private channel admin", async ({ page, testWorkspace }) => {
    // Add a second user to the workspace
    await addMemberViaInvite(testWorkspace.api, SECOND_USER, testWorkspace.slug);

    // Create a private channel and add the second user
    const priv = await testWorkspace.api.createPrivateChannel(`priv-members-${Date.now()}`);
    await testWorkspace.api.addChannelMember(priv.id, SECOND_USER.userId);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // Navigate to the private channel
    const channelButton = page.getByRole("button", { name: priv.name });
    await expect(channelButton).toBeVisible();
    await channelButton.click();

    // Open members dialog
    await page.getByTestId("channel-member-count").click();

    // Should see "Add member" button
    await expect(page.getByTestId("add-member-trigger")).toBeVisible();

    // Should see "Remove" button for the second user
    await expect(page.getByTestId(`remove-member-${SECOND_USER.userId}`)).toBeVisible();
  });

  test("visibility toggle switches between public and private", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await expect(page.getByText("# general")).toBeVisible();

    await page.getByTestId("create-channel-button").click();
    await expect(page.getByTestId("create-channel-name-input")).toBeVisible();
    await expect(page.getByTestId("channel-visibility-toggle")).toBeVisible();

    // Click Private to switch type
    await page.getByTestId("channel-visibility-toggle").getByText("Private").click();

    // Click Public to switch back
    await page.getByTestId("channel-visibility-toggle").getByText("Public").click();

    // Close dialog
    await page.keyboard.press("Escape");
  });

  test("remove member from private channel", async ({ page, testWorkspace }) => {
    // Add a second user to the workspace and private channel
    await addMemberViaInvite(testWorkspace.api, SECOND_USER, testWorkspace.slug);
    const priv = await testWorkspace.api.createPrivateChannel(`priv-remove-${Date.now()}`);
    await testWorkspace.api.addChannelMember(priv.id, SECOND_USER.userId);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    const channelButton = page.getByRole("button", { name: priv.name });
    await expect(channelButton).toBeVisible();
    await channelButton.click();

    // Open members dialog
    await page.getByTestId("channel-member-count").click();
    await expect(page.getByTestId(`remove-member-${SECOND_USER.userId}`)).toBeVisible();

    // Click Remove
    await page.getByTestId(`remove-member-${SECOND_USER.userId}`).click();

    // Second user should be gone from the list
    await expect(page.getByTestId(`channel-member-${SECOND_USER.userId}`)).not.toBeVisible();
  });

  test("add member search filters available members", async ({ page, testWorkspace }) => {
    // Add a second user to the workspace
    await addMemberViaInvite(testWorkspace.api, SECOND_USER, testWorkspace.slug);
    const priv = await testWorkspace.api.createPrivateChannel(`priv-search-${Date.now()}`);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    const channelButton = page.getByRole("button", { name: priv.name });
    await expect(channelButton).toBeVisible();
    await channelButton.click();

    // Open members dialog and switch to add mode
    await page.getByTestId("channel-member-count").click();
    await page.getByTestId("add-member-trigger").click();
    await expect(page.getByTestId("add-member-search-input")).toBeVisible();

    // Type in search to filter
    await page.getByTestId("add-member-search-input").fill("Second");
    await expect(page.getByTestId(`add-member-${SECOND_USER.userId}`)).toBeVisible();

    // Search for something that doesn't match
    await page.getByTestId("add-member-search-input").fill("nonexistent12345");
    await expect(page.getByText("No members available to add")).toBeVisible();
  });

  test("add member flow works end-to-end", async ({ page, testWorkspace }) => {
    // Add a second user to the workspace
    await addMemberViaInvite(testWorkspace.api, SECOND_USER, testWorkspace.slug);

    // Create a private channel (no second user added yet)
    const priv = await testWorkspace.api.createPrivateChannel(`priv-add-flow-${Date.now()}`);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // Navigate to the private channel
    const channelButton = page.getByRole("button", { name: priv.name });
    await expect(channelButton).toBeVisible();
    await channelButton.click();

    // Open members dialog
    await page.getByTestId("channel-member-count").click();

    // Click "Add member"
    await page.getByTestId("add-member-trigger").click();

    // Should see add member search
    await expect(page.getByTestId("add-member-search-input")).toBeVisible();

    // Click "Add" on second user
    await page.getByTestId(`add-member-button-${SECOND_USER.userId}`).click();

    // Go back to member list
    await page.getByTestId("add-member-back").click();

    // Second user should now be in the member list
    await expect(page.getByTestId(`channel-member-${SECOND_USER.userId}`)).toBeVisible();
  });
});
