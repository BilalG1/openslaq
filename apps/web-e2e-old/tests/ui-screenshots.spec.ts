import { expect } from "@playwright/test";
import { test, createSecondUserApi, addMemberViaInvite } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";
import { openWorkspaceChannel, openWorkspaceSettings, sendMessageAndWait } from "./helpers/chat-ui";
import { SECOND_USER, SHOWCASE_ALICE, SHOWCASE_BOB, SHOWCASE_CAROL } from "./helpers/api";

test.describe("UI Screenshots", () => {
  // ── Existing screenshots ──────────────────────────────────────────

  test("workspace list page (with workspaces)", async ({ page, testWorkspace: _tw }) => {
    await setupMockAuth(page);
    await page.goto("/");
    await expect(page.getByText("Your Workspaces")).toBeVisible();
    await page.screenshot({ path: "test-results/workspace-list.png" });
  });

  test("invite accept page", async ({ page, testWorkspace }) => {
    const invite = await testWorkspace.api.createInvite();
    await setupMockAuth(page, {
      id: SECOND_USER.userId,
      displayName: SECOND_USER.displayName,
      email: SECOND_USER.email,
    });
    await page.goto(`/invite/${invite.code}`);
    await expect(page.getByRole("button", { name: "Accept Invite" })).toBeVisible();
    await page.screenshot({ path: "test-results/invite-accept.png", fullPage: true });
  });

  test("workspace settings page", async ({ page, testWorkspace }) => {
    const invite = await testWorkspace.api.createInvite();
    const secondApi = createSecondUserApi(testWorkspace.slug, SECOND_USER);
    await secondApi.acceptInvite(invite.code);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await openWorkspaceSettings(page, testWorkspace.name);
    await expect(page.getByTestId("role-badge-e2e-test-user-001")).toBeVisible();
    await page.screenshot({ path: "test-results/workspace-settings.png", fullPage: true });
  });

  test("thread panel open", async ({ page, testWorkspace }) => {
    const generalChannel = await testWorkspace.api.getChannelByName("general");
    const parent = await testWorkspace.api.createMessage(generalChannel.id, "Here is a message with a thread!");
    await testWorkspace.api.createThreadReply(generalChannel.id, parent.id, "This is a reply in the thread");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.getByText("Here is a message with a thread!")).toBeVisible();

    await page.getByText("Here is a message with a thread!").hover();
    await page.getByTestId("reply-action-trigger").click();
    await expect(page.getByText("This is a reply in the thread")).toBeVisible();
    await page.screenshot({ path: "test-results/thread-panel.png", fullPage: true });
  });

  test("search modal", async ({ page, testWorkspace }) => {
    const generalChannel = await testWorkspace.api.getChannelByName("general");
    await testWorkspace.api.createMessage(generalChannel.id, "Searchable test message for screenshot");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.getByText("Searchable test message")).toBeVisible();

    await page.getByTestId("search-trigger").click();
    await expect(page.getByTestId("search-modal")).toBeVisible();

    await page.getByTestId("search-input").fill("Searchable");
    await expect(page.getByText(/\d+ result/)).toBeVisible();
    await page.screenshot({ path: "test-results/search-modal.png", fullPage: true });
  });

  test("new DM dialog", async ({ page, testWorkspace }) => {
    const invite = await testWorkspace.api.createInvite();
    const secondApi = createSecondUserApi(testWorkspace.slug, SECOND_USER);
    await secondApi.acceptInvite(invite.code);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    await page.getByTestId("new-dm-button").click();
    await expect(page.getByText("New Direct Message")).toBeVisible();
    await page.screenshot({ path: "test-results/new-dm-dialog.png", fullPage: true });
  });

  // ── New screenshots ───────────────────────────────────────────────

  test("channel with messages and reactions", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    // Seed messages from multiple users
    const aliceApi = await addMemberViaInvite(testWorkspace.api, SHOWCASE_ALICE, testWorkspace.slug);
    const bobApi = await addMemberViaInvite(testWorkspace.api, SHOWCASE_BOB, testWorkspace.slug);

    const msg1 = await aliceApi.createMessage(channel.id, "Hey team! Just pushed the new deploy pipeline. Let me know if anything breaks.");
    const msg2 = await bobApi.createMessage(channel.id, "Nice work Alice! I tested locally and everything looks great.");
    const msg3 = await testWorkspace.api.createMessage(channel.id, "Awesome — merging to main now. Thanks for the quick turnaround!");

    // Add reactions (use unicode directly for proper glyph rendering)
    await aliceApi.toggleReaction(msg2.id, "👍");
    await bobApi.toggleReaction(msg1.id, "🚀");
    await testWorkspace.api.toggleReaction(msg1.id, "🚀");
    await testWorkspace.api.toggleReaction(msg1.id, "✅");
    await aliceApi.toggleReaction(msg3.id, "🎉");
    await bobApi.toggleReaction(msg3.id, "🎉");

    await openWorkspaceChannel(page, testWorkspace.slug);
    await expect(page.getByText("merging to main now")).toBeVisible();
    // Wait for reactions to render (reactions are rendered as pill buttons with test IDs)
    await expect(page.getByTestId("reaction-pill-🚀").first()).toBeVisible();
    await page.screenshot({ path: "test-results/channel-messages-reactions.png", fullPage: true });
  });

  test("DM conversation", async ({ page, testWorkspace }) => {
    const bobApi = await addMemberViaInvite(testWorkspace.api, SHOWCASE_BOB, testWorkspace.slug);

    // Create DM and exchange messages
    const dm = await testWorkspace.api.createDm(SHOWCASE_BOB.userId);
    await testWorkspace.api.createMessage(dm.channel.id, "Hey Bob, got a minute to chat about the API changes?");
    await bobApi.createMessage(dm.channel.id, "Sure! What's on your mind?");
    await testWorkspace.api.createMessage(dm.channel.id, "I'm thinking we should add pagination to the search endpoint. Current approach won't scale.");
    await bobApi.createMessage(dm.channel.id, "Agreed. Cursor-based or offset? I'd lean toward cursor-based for consistency.");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    // Click on the DM in sidebar
    await expect(page.getByText("Bob Martinez")).toBeVisible();
    await page.getByText("Bob Martinez").click();
    await expect(page.getByText("Cursor-based or offset")).toBeVisible();
    await page.screenshot({ path: "test-results/dm-conversation.png", fullPage: true });
  });

  test("pinned messages popover", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const msg1 = await testWorkspace.api.createMessage(channel.id, "Team standup at 10am daily — join #standup");
    const msg2 = await testWorkspace.api.createMessage(channel.id, "Deploy process: run `bun run deploy` from main branch only");
    await testWorkspace.api.pinMessage(channel.id, msg1.id);
    await testWorkspace.api.pinMessage(channel.id, msg2.id);

    await openWorkspaceChannel(page, testWorkspace.slug);
    await expect(page.getByTestId("pinned-count")).toContainText("2", { timeout: 15_000 });

    // Open pinned messages popover and wait for content to load
    await page.getByTestId("pinned-messages-button").click();
    await expect(page.getByTestId(/^pinned-item-/).first()).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: "test-results/pinned-messages.png", fullPage: true });
  });

  test("channel with bookmarks", async ({ page, testWorkspace }) => {
    await openWorkspaceChannel(page, testWorkspace.slug);

    // Add first bookmark via overflow menu (no bookmarks yet)
    await page.getByTestId("channel-overflow-menu").click();
    await page.getByTestId("add-bookmark-button").click();
    await expect(page.getByTestId("bookmark-url-input")).toBeVisible();
    await page.getByTestId("bookmark-url-input").fill("https://github.com/openslaq/openslaq");
    await page.getByTestId("bookmark-title-input").fill("GitHub Repo");
    await page.getByTestId("bookmark-add-button").click();
    await expect(page.getByText("GitHub Repo")).toBeVisible();

    // Add a second bookmark
    await page.getByTestId("add-bookmark-button").click();
    await page.getByTestId("bookmark-url-input").fill("https://docs.openslaq.dev");
    await page.getByTestId("bookmark-title-input").fill("Documentation");
    await page.getByTestId("bookmark-add-button").click();
    await expect(page.getByText("Documentation")).toBeVisible();

    await page.screenshot({ path: "test-results/channel-bookmarks.png", fullPage: true });
  });

  test("message action bar on hover", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    await testWorkspace.api.createMessage(channel.id, "Hover over me to see the action bar!");

    await openWorkspaceChannel(page, testWorkspace.slug);
    await expect(page.getByText("Hover over me to see the action bar!")).toBeVisible();

    // Hover to reveal action bar
    await page.getByText("Hover over me to see the action bar!").hover();
    await expect(page.getByTestId("reply-action-trigger")).toBeVisible();
    await page.screenshot({ path: "test-results/message-action-bar.png", fullPage: true });
  });

  test("user profile sidebar", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const bobApi = await addMemberViaInvite(testWorkspace.api, SHOWCASE_BOB, testWorkspace.slug);
    await bobApi.createMessage(channel.id, "Here is a message from Bob");

    await openWorkspaceChannel(page, testWorkspace.slug);
    await expect(page.getByText("Here is a message from Bob")).toBeVisible();

    // Click the avatar to open profile sidebar and wait for it to load
    await page.getByTestId(/^message-avatar-/).first().click();
    await expect(page.getByTestId("profile-sidebar")).toBeVisible();
    await expect(page.getByText("Loading profile")).toBeHidden({ timeout: 15_000 });
    await page.screenshot({ path: "test-results/user-profile-sidebar.png", fullPage: true });
  });

  test("dark mode channel view", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const aliceApi = await addMemberViaInvite(testWorkspace.api, SHOWCASE_ALICE, testWorkspace.slug);
    await aliceApi.createMessage(channel.id, "Working on the new feature branch");
    await testWorkspace.api.createMessage(channel.id, "Sounds good — ping me when it's ready for review!");

    // Set dark mode before navigating
    await page.addInitScript(() => localStorage.setItem("openslaq-theme", "dark"));
    await openWorkspaceChannel(page, testWorkspace.slug);
    await expect(page.getByText("ready for review")).toBeVisible();
    await page.screenshot({ path: "test-results/dark-mode-channel.png", fullPage: true });
  });

  test("multi-user channel conversation", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");

    const aliceApi = await addMemberViaInvite(testWorkspace.api, SHOWCASE_ALICE, testWorkspace.slug);
    const bobApi = await addMemberViaInvite(testWorkspace.api, SHOWCASE_BOB, testWorkspace.slug);
    const carolApi = await addMemberViaInvite(testWorkspace.api, SHOWCASE_CAROL, testWorkspace.slug);

    await aliceApi.createMessage(channel.id, "Hey everyone — sprint planning in 30 min. Please review the backlog beforehand.");
    await bobApi.createMessage(channel.id, "Got it. I've updated my estimates on the API tickets.");
    await carolApi.createMessage(channel.id, "The design mocks for the new onboarding flow are in Figma. Link in the channel bookmarks.");
    await testWorkspace.api.createMessage(channel.id, "Perfect. I'll prioritize the onboarding work — it's blocking beta signups.");
    await aliceApi.createMessage(channel.id, "Agreed. Let's also discuss the search performance issues during planning.");

    await openWorkspaceChannel(page, testWorkspace.slug);
    await expect(page.getByText("search performance issues")).toBeVisible();
    await page.screenshot({ path: "test-results/multi-user-conversation.png", fullPage: true });
  });

  test("saved items view", async ({ page, testWorkspace }) => {
    await openWorkspaceChannel(page, testWorkspace.slug);

    // Send and save a message
    await sendMessageAndWait(page, "Important: deploy checklist for Friday release");
    await expect(page.getByText("deploy checklist for Friday release")).toBeVisible();

    // Save it via message action menu
    await page.getByText("deploy checklist for Friday release").hover();
    await page.getByTestId("message-overflow-menu").click();
    await page.getByTestId("save-message-action").click();

    // Navigate to Saved Items
    await page.getByTestId("saved-view-link").click();
    await expect(page.getByRole("heading", { name: "Saved Items" })).toBeVisible();
    await expect(page.getByText("deploy checklist")).toBeVisible();
    await page.screenshot({ path: "test-results/saved-items-view.png", fullPage: true });
  });
});
