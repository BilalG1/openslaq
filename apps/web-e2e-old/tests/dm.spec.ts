import { expect, type Page } from "@playwright/test";
import { test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";
import { ApiHelper, SHOWCASE_ALICE, SHOWCASE_BOB } from "./helpers/api";

async function sendMessage(page: Page, content: string) {
  const editor = page.locator(".tiptap");
  await editor.click();
  await page.keyboard.type(content);
  const sent = page.waitForResponse(
    (res) => res.url().includes("/messages") && res.request().method() === "POST" && res.status() === 201,
  );
  await page.keyboard.press("Enter");
  await sent;
}

test.describe("Direct Messages", () => {
  test("DM section visible in sidebar", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await expect(page.getByText("Direct Messages")).toBeVisible();
  });

  test("start new DM via + button", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // Hover DMs header to reveal + button, then click it
    await page.getByTestId("dms-section-header").hover();
    await page.getByTestId("new-dm-button").click();

    // Dialog should appear with "New Direct Message" heading
    await expect(page.getByRole("heading", { name: "New Direct Message" })).toBeVisible();

    // Select ourselves — use the dialog-specific button with email text
    const dialog = page.getByRole("dialog");
    await dialog.getByText("test@openslaq.dev").click();
    await dialog.getByTestId("dm-go-button").click();

    // DM header should show with "(notes)" for self-DM
    await expect(page.getByText("Test User (notes)")).toBeVisible();
  });

  test("self-DM appears in sidebar", async ({ page, testWorkspace }) => {
    // Create a self-DM via API
    await testWorkspace.api.createDm("e2e-test-user-001");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // Self-DM should appear in sidebar with "(you)" suffix
    await expect(page.getByText("Test User (you)")).toBeVisible();
  });

  test("send message in DM", async ({ page, testWorkspace }) => {
    // Create a self-DM via API
    await testWorkspace.api.createDm("e2e-test-user-001");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // Click the self-DM in sidebar
    await page.getByText("Test User (you)").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // Send a message
    const msg = `dm-test-${Date.now()}`;
    await sendMessage(page, msg);

    // Switch to a channel and back to force re-fetch
    await page.getByText("# general").click();
    await page.locator(".tiptap").waitFor();
    const loaded = page.waitForResponse(
      (res) => res.url().includes("/messages") && res.request().method() === "GET",
    );
    await page.getByText("Test User (you)").click();
    await loaded;

    // The message should appear
    await expect(page.getByText(msg)).toBeVisible();
  });

  test("DMs and channels are separate", async ({ page, testWorkspace }) => {
    // Create a self-DM
    await testWorkspace.api.createDm("e2e-test-user-001");

    await setupMockAuth(page);
    const dmsLoaded = page.waitForResponse(
      (res) =>
        res.url().includes(`/api/workspaces/${testWorkspace.slug}/dm`) &&
        res.request().method() === "GET" &&
        res.status() === 200,
    );
    await page.goto(`/w/${testWorkspace.slug}`);
    await dmsLoaded;

    // Channels should be visible
    await expect(page.getByText("# general")).toBeVisible();
    await expect(page.getByRole("button", { name: "Direct Messages" })).toBeVisible();

    // DM should be visible
    await expect(page.getByRole("button", { name: "Test User (you)" })).toBeVisible();

    // The DM should NOT have a # prefix (it's not a channel)
    const dmButton = page.getByRole("button", { name: "Test User (you)" });
    const dmText = await dmButton.textContent();
    expect(dmText).not.toContain("#");
  });

  test("switch between DM and channel", async ({ page, testWorkspace }) => {
    // Create a self-DM
    await testWorkspace.api.createDm("e2e-test-user-001");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // Select a channel
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // Switch to DM
    await page.getByText("Test User (you)").click();
    await expect(page.getByText("Test User (notes)")).toBeVisible(); // DM header

    // Switch back to channel
    await page.getByText("# random").click();
    // Channel header should show
    await expect(page.locator(".tiptap")).toBeVisible();
  });

  test("showcase: direct message conversation", async ({ page, testWorkspace }) => {
    // Alice and Bob need workspace membership for DMs — accept invite
    const { code } = await testWorkspace.api.createInvite();
    const alice = new ApiHelper(SHOWCASE_ALICE, testWorkspace.slug);
    const bob = new ApiHelper(SHOWCASE_BOB, testWorkspace.slug);
    await alice.acceptInvite(code);
    await bob.acceptInvite(code);

    // Alice creates a DM with Bob and seeds messages
    const { channel: dm } = await alice.createDm(SHOWCASE_BOB.userId);
    await alice.createMessage(dm.id, "Hey Bob! Do you have a minute to chat about the design review?");
    await bob.createMessage(dm.id, "Sure! I just finished looking at the mockups. They look really polished.");
    await alice.createMessage(dm.id, "Awesome! I was thinking we should focus on the **navigation flow** first.");
    await bob.createMessage(dm.id, "Agreed. I'll put together some notes and share them before the meeting tomorrow.");

    await setupMockAuth(page, { id: SHOWCASE_ALICE.userId, displayName: SHOWCASE_ALICE.displayName, email: SHOWCASE_ALICE.email });
    await page.goto(`/w/${testWorkspace.slug}`);

    // Click the DM in sidebar
    await page.getByText("Bob Martinez").click();
    await expect(page.getByText("Do you have a minute")).toBeVisible();
    await expect(page.getByText("share them before the meeting")).toBeVisible();

    await page.screenshot({ path: "test-results/direct-messages.png" });
  });
});
