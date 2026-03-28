import { expect, type Page } from "@playwright/test";
import { sharedTest as test, addMemberViaInvite } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";
import { SHOWCASE_ALICE, SHOWCASE_BOB, SHOWCASE_CAROL } from "./helpers/api";

/** Type a message in the TipTap editor and send it via Enter. */
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

/** Switch away from the current channel and back to force a message re-fetch. */
async function refreshChannel(page: Page, channelName: string) {
  const other = channelName === "general" ? "random" : "general";
  await page.getByText(`# ${other}`).click();
  await page.locator(".tiptap").waitFor();
  const loaded = page.waitForResponse(
    (res) => res.url().includes("/messages") && res.request().method() === "GET",
  );
  await page.getByText(`# ${channelName}`).click();
  await loaded;
}

test.describe("Messaging", () => {
  test("send a message and see it appear", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    const msg = `hello-e2e-${Date.now()}`;
    await sendMessage(page, msg);

    // Re-navigate to trigger re-fetch
    await refreshChannel(page, "general");

    await expect(page.getByText(msg)).toBeVisible();
  });

  test("send multiple messages and verify ordering", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    const ts = Date.now();
    const msgs = [`msg-a-${ts}`, `msg-b-${ts}`, `msg-c-${ts}`];

    for (const msg of msgs) {
      await sendMessage(page, msg);
    }

    await refreshChannel(page, "general");

    // Verify all messages are visible
    for (const msg of msgs) {
      await expect(page.getByText(msg)).toBeVisible();
    }

    // Verify chronological order (a before b before c in the page)
    const body = await page.textContent("body");
    const positions = msgs.map((m) => body!.indexOf(m));
    expect(positions[0]).toBeGreaterThan(-1);
    expect(positions[0]).toBeLessThan(positions[1]!);
    expect(positions[1]).toBeLessThan(positions[2]!);
  });

  test("empty message cannot be sent", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    const editor = page.locator(".tiptap");
    await expect(editor).toBeVisible();

    // Track POST requests to messages endpoint
    const messageRequests: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/messages") && req.method() === "POST") {
        messageRequests.push(req.url());
      }
    });

    // Press Enter in empty editor — should NOT send a message
    await editor.click();
    await page.keyboard.press("Enter");

    // Verify no POST was made (editor should still be empty and focused)
    await expect(editor).toBeFocused();
    expect(messageRequests).toHaveLength(0);
  });

  test("message shows author and timestamp", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const msg = `author-ts-${Date.now()}`;
    await testWorkspace.api.createMessage(channel.id, msg);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    // Verify message content
    await expect(page.getByText(msg)).toBeVisible();

    // Verify author displayName is shown (use .first() since multiple messages may exist)
    await expect(page.getByText("Test User").first()).toBeVisible();

    // Verify a timestamp is present (H:MM AM/PM pattern)
    const timestamps = page.locator("span").filter({ hasText: /\d{1,2}:\d{2}\s*(AM|PM)/i });
    await expect(timestamps.first()).toBeVisible();
  });

  test("send message failure shows mutation error", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    await page.route(`**/api/workspaces/${testWorkspace.slug}/channels/*/messages`, async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Send message failed" }),
        });
        return;
      }
      await route.continue();
    });

    const editor = page.locator(".tiptap");
    await editor.click();
    await page.keyboard.type(`send-fail-${Date.now()}`);
    await page.keyboard.press("Enter");

    await expect(page.getByText("Send message failed")).toBeVisible();
  });

  test("showcase: multi-user conversation", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const [alice, bob, carol] = await Promise.all([
      addMemberViaInvite(testWorkspace.api, SHOWCASE_ALICE, testWorkspace.slug),
      addMemberViaInvite(testWorkspace.api, SHOWCASE_BOB, testWorkspace.slug),
      addMemberViaInvite(testWorkspace.api, SHOWCASE_CAROL, testWorkspace.slug),
    ]);

    // Seed a realistic sprint planning conversation
    await alice.createMessage(channel.id, "Good morning team! Let's kick off sprint planning. What's everyone working on?");
    await bob.createMessage(channel.id, "I'm wrapping up the search feature. Should be ready for review by end of day.");
    await carol.createMessage(channel.id, "I'll be tackling the notification system. Already drafted the schema changes.");
    await alice.createMessage(channel.id, "Great progress! Bob, can you also look into the performance issue on the dashboard?");
    await bob.createMessage(channel.id, "Sure thing. I noticed the query is doing a full table scan — should be a quick index fix.");
    await carol.createMessage(channel.id, "I can help with that too. I optimized a similar query last sprint.");
    await alice.createMessage(channel.id, "Perfect. Let's sync up after lunch to review the priorities.");
    await bob.createMessage(channel.id, "Sounds good! I'll have the PR ready by then.");

    await setupMockAuth(page, { id: SHOWCASE_ALICE.userId, displayName: SHOWCASE_ALICE.displayName, email: SHOWCASE_ALICE.email });
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    // Wait for messages to load
    await expect(page.getByText("kick off sprint planning")).toBeVisible();
    await expect(page.getByText("I'll have the PR ready")).toBeVisible();

    await page.screenshot({ path: "test-results/multi-user-conversation.png" });
  });
});
