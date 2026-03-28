import { expect } from "@playwright/test";
import { sharedTest as test, addMemberViaInvite } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";
import { SHOWCASE_ALICE, SHOWCASE_BOB } from "./helpers/api";

test.describe("Mentions", () => {
  test.beforeAll(async ({ testWorkspace }) => {
    await addMemberViaInvite(testWorkspace.api, SHOWCASE_ALICE, testWorkspace.slug);
    await addMemberViaInvite(testWorkspace.api, SHOWCASE_BOB, testWorkspace.slug);
  });

  test("typing @ shows mention autocomplete dropdown", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    const editor = page.locator(".tiptap");
    await editor.click();
    await page.keyboard.type("@");

    // Should show autocomplete with @here and @channel
    const dropdown = page.locator("button").filter({ hasText: /notify online members/ });
    await expect(dropdown).toBeVisible({ timeout: 5000 });
  });

  test("typing @ali filters to matching members", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);

    // Set up response waiter BEFORE navigating so we don't miss it
    const membersLoaded = page.waitForResponse(
      (res) => res.url().includes("/members") && res.request().method() === "GET" && res.status() === 200,
      { timeout: 15000 },
    );

    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // Wait for members API to complete so autocomplete has data
    await membersLoaded;

    const editor = page.locator(".tiptap");
    await editor.click();
    await page.keyboard.type("@Ali");

    // Should show Alice in the dropdown
    const aliceOption = page.locator("button").filter({ hasText: "Alice Johnson" });
    await expect(aliceOption).toBeVisible({ timeout: 5000 });
  });

  test("message with mention renders as styled badge", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);

    // Send message with mention via API
    const members = await testWorkspace.api.getMembers();
    const alice = members.find((m) => m.displayName === "Alice Johnson");
    expect(alice).toBeDefined();

    const general = await testWorkspace.api.getChannelByName("general");
    await testWorkspace.api.createMessage(general.id, `Hey <@${alice!.id}> check this out`);

    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // The rendered message should show @Alice Johnson as a styled badge
    const mentionBadge = page.locator("button").filter({ hasText: "@Alice Johnson" });
    await expect(mentionBadge).toBeVisible({ timeout: 10000 });
  });

  test("@here and @channel render as styled labels", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);

    // Send message with group mentions via API
    const general = await testWorkspace.api.getChannelByName("general");
    await testWorkspace.api.createMessage(general.id, "Attention <@here> and <@channel>");

    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // Should render @here and @channel as styled spans
    const hereBadge = page.locator("span").filter({ hasText: "@here" });
    const channelBadge = page.locator("span").filter({ hasText: "@channel" });
    await expect(hereBadge).toBeVisible({ timeout: 10000 });
    await expect(channelBadge).toBeVisible({ timeout: 10000 });
  });
});
