import { expect } from "@playwright/test";
import { sharedTest as test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";

test.describe("Message pagination", () => {
  test("shows all messages when fewer than page size", async ({ page, testWorkspace }) => {
    const channelName = `few-msgs-${Date.now()}`;
    const channel = await testWorkspace.api.createChannel(channelName);

    // Create 10 messages in parallel (all should be visible regardless of order)
    const msgs = Array.from({ length: 10 }, (_, i) => `few-${channelName}-${String(i + 1).padStart(3, "0")}`);
    await Promise.all(msgs.map((content) => testWorkspace.api.createMessage(channel.id, content)));

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText(`# ${channelName}`).click();

    // All 10 messages should be visible
    for (const msg of msgs) {
      await expect(page.getByText(msg)).toBeVisible();
    }
  });

  test("infinite scroll loads all messages across pages", async ({ page, testWorkspace }) => {
    const channelName = `many-msgs-${Date.now()}`;
    const channel = await testWorkspace.api.createChannel(channelName);

    // Create 60 messages in three batches to ensure correct ordering:
    // Batch 1 (001-010) oldest
    // Batch 2 (011-050) middle
    // Batch 3 (051-060) newest
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        testWorkspace.api.createMessage(channel.id, `many-${channelName}-${String(i + 1).padStart(3, "0")}`),
      ),
    );
    await Promise.all(
      Array.from({ length: 40 }, (_, i) =>
        testWorkspace.api.createMessage(channel.id, `many-${channelName}-${String(i + 11).padStart(3, "0")}`),
      ),
    );
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        testWorkspace.api.createMessage(channel.id, `many-${channelName}-${String(i + 51).padStart(3, "0")}`),
      ),
    );

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText(`# ${channelName}`).click();

    // The latest messages should be visible
    await expect(page.getByText(`many-${channelName}-060`)).toBeVisible();
    await expect(page.getByText(`many-${channelName}-051`)).toBeVisible();

    // Scroll up repeatedly to trigger IntersectionObserver and load older pages.
    // Scroll anchoring restores position after each prepend, so we retry.
    const scrollContainer = page.getByTestId("message-list-scroll");
    await expect(async () => {
      await scrollContainer.evaluate((el) => { el.scrollTop = 0; });
      await expect(page.getByText(`many-${channelName}-001`)).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 15_000 });
    await expect(page.getByText(`many-${channelName}-010`)).toBeVisible();
  });

  test("scrolling to top loads older messages", async ({ page, testWorkspace }) => {
    const channelName = `scroll-older-${Date.now()}`;
    const channel = await testWorkspace.api.createChannel(channelName);

    // Create 70 messages sequentially so ordering is deterministic
    for (let i = 1; i <= 70; i++) {
      await testWorkspace.api.createMessage(
        channel.id,
        `scroll-${channelName}-${String(i).padStart(3, "0")}`,
      );
    }

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText(`# ${channelName}`).click();

    // Wait for latest messages to load
    await expect(page.getByText(`scroll-${channelName}-070`)).toBeVisible();

    // Scroll to the top of the message list to trigger loading older messages.
    // Use the correct container (message-list-scroll) and retry because scroll
    // anchoring restores position after each prepend.
    const scrollContainer = page.getByTestId("message-list-scroll");
    await expect(async () => {
      await scrollContainer.evaluate((el) => { el.scrollTop = 0; });
      await expect(page.getByText(`scroll-${channelName}-001`)).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 15_000 });
  });

  test("scrolling down loads newer messages after jumping to old message", async ({ page, testWorkspace }) => {
    test.setTimeout(120000);

    const channelName = `load-newer-${Date.now()}`;
    const channel = await testWorkspace.api.createChannel(channelName);

    // Create search target as the very first message
    const uniqueWord = `newer${Date.now()}`;
    await testWorkspace.api.createMessage(channel.id, `${uniqueWord} target message`);

    // Create 80 more messages in parallel batches to push target out of initial page
    // and beyond the "around" window (25 after). We need >50+25=75 to guarantee
    // the last message isn't in the around window or auto-loaded initial page.
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        testWorkspace.api.createMessage(channel.id, `load-newer-${channelName}-${String(i + 2).padStart(3, "0")}`),
      ),
    );
    await Promise.all(
      Array.from({ length: 30 }, (_, i) =>
        testWorkspace.api.createMessage(channel.id, `load-newer-${channelName}-${String(i + 22).padStart(3, "0")}`),
      ),
    );
    await Promise.all(
      Array.from({ length: 31 }, (_, i) =>
        testWorkspace.api.createMessage(channel.id, `load-newer-${channelName}-${String(i + 52).padStart(3, "0")}`),
      ),
    );

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText(`# ${channelName}`).click();

    // Wait for initial load — target should NOT be visible (it's the oldest message)
    await expect(page.getByText(`${uniqueWord} target message`)).not.toBeVisible({ timeout: 10_000 });

    // Use search to navigate to the old target message (triggers getMessagesAround)
    await page.keyboard.press("Meta+k");
    await page.getByTestId("search-input").fill(uniqueWord);
    await expect(page.getByTestId("search-results").locator("button").first()).toBeVisible({ timeout: 10000 });
    await page.getByTestId("search-results").locator("button").first().click();
    await expect(page.getByTestId("search-modal")).not.toBeVisible();

    // Target message should now be visible (loaded via getMessagesAround)
    await expect(page.getByText(`${uniqueWord} target message`)).toBeVisible({ timeout: 10000 });

    let failedNewerRequest = false;
    await page.route(`**/api/workspaces/${testWorkspace.slug}/channels/${channel.id}/messages**`, async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (
        request.method() === "GET" &&
        url.searchParams.get("direction") === "newer" &&
        !failedNewerRequest
      ) {
        failedNewerRequest = true;
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Newer page failed once" }),
        });
        return;
      }
      await route.continue();
    });

    // Scroll down repeatedly to trigger loading newer messages through multiple pages.
    // This ensures useLoadNewerMessages runs to completion across pages.
    const scrollContainer = page.getByTestId("message-list-scroll");

    await expect(async () => {
      await scrollContainer.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      // Check for a middle-range message proving pagination loaded at least one newer page
      await expect(page.getByText(`load-newer-${channelName}-040`)).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 30_000 });

    // Continue scrolling to reach the very last message
    await expect(async () => {
      await scrollContainer.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await expect(page.getByText(`load-newer-${channelName}-082`)).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 30_000 });

  });
});
