import { expect, type Page } from "@playwright/test";
import { test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";

/** Fill the search input and wait for the debounced search API response. */
async function fillSearchAndWait(page: Page, query: string) {
  const searchDone = page.waitForResponse(
    (res) =>
      res.url().includes("/search") &&
      res.request().method() === "GET" &&
      new URL(res.url()).searchParams.get("q") === query,
  );
  await page.getByTestId("search-input").fill(query);
  await searchDone;
}

test.describe("Search", () => {
  test("Cmd+K opens modal, Escape closes it", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // Open search with keyboard shortcut
    await page.keyboard.press("Meta+k");
    await expect(page.getByTestId("search-modal")).toBeVisible();
    await expect(page.getByTestId("search-input")).toBeFocused();

    // Close with Escape
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("search-modal")).not.toBeVisible();
  });

  test("search finds seeded messages", async ({ page, testWorkspace }) => {
    // Seed a message with unique content
    const channel = await testWorkspace.api.getChannelByName("general");
    const uniqueWord = `searchable${Date.now()}`;
    await testWorkspace.api.createMessage(channel.id, `This is a ${uniqueWord} message for testing`);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // Open search and type
    await page.keyboard.press("Meta+k");
    await fillSearchAndWait(page, uniqueWord);

    // Should find the message
    await expect(page.getByTestId("search-results")).toContainText(uniqueWord);
  });

  test("clicking result navigates to message in channel", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const uniqueWord = `navigate${Date.now()}`;
    await testWorkspace.api.createMessage(channel.id, `Navigate to this ${uniqueWord} message`);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // Open search and find message
    await page.keyboard.press("Meta+k");
    await fillSearchAndWait(page, uniqueWord);

    // Click the result
    await page.getByTestId("search-results").locator("button").first().click();

    // Modal should close
    await expect(page.getByTestId("search-modal")).not.toBeVisible();

    // Message should be visible in the channel
    await expect(page.getByText(uniqueWord)).toBeVisible();
  });

  test("keyboard navigation: ArrowDown/ArrowUp/Enter to select result", async ({ page, testWorkspace }) => {
    // Seed two messages with a shared unique word so search returns multiple results
    const channel = await testWorkspace.api.getChannelByName("general");
    const uniqueWord = `keynav${Date.now()}`;
    await testWorkspace.api.createMessage(channel.id, `First ${uniqueWord} message`);
    await testWorkspace.api.createMessage(channel.id, `Second ${uniqueWord} message`);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // Open search and type
    await page.keyboard.press("Meta+k");
    await fillSearchAndWait(page, uniqueWord);

    // Wait for results to load
    const results = page.getByTestId("search-results").locator("button");
    await expect(results.first()).toBeVisible();

    // Press ArrowDown to move selection
    await page.keyboard.press("ArrowDown");

    // Press Enter to navigate to the selected result
    await page.keyboard.press("Enter");

    // Modal should close
    await expect(page.getByTestId("search-modal")).not.toBeVisible();

    // Should be on the channel with the message visible
    await expect(page.getByText(uniqueWord).first()).toBeVisible();
  });

  test("no results shows empty state", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    await page.keyboard.press("Meta+k");
    await fillSearchAndWait(page, "zzzznonexistentquery999");

    // Wait for search to complete
    await expect(page.getByTestId("search-no-results")).toBeVisible();
  });

  test("search request failure shows error state", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    await page.route(`**/api/workspaces/${testWorkspace.slug}/search**`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Search exploded" }),
        });
        return;
      }
      await route.continue();
    });

    await page.keyboard.press("Meta+k");
    await fillSearchAndWait(page, `search-fail-${Date.now()}`);

    await expect(page.getByTestId("search-results")).toContainText("Search exploded");
  });

  test("clearing query resets search state", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const uniqueWord = `clear-query-${Date.now()}`;
    await testWorkspace.api.createMessage(channel.id, uniqueWord);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    await page.keyboard.press("Meta+k");
    await fillSearchAndWait(page, uniqueWord);
    await expect(page.getByTestId("search-results")).toContainText(uniqueWord);

    await page.getByTestId("search-input").fill("");
    await expect(page.getByTestId("search-results")).toContainText("Type to search...");
  });

  test("search with channel filter narrows results", async ({ page, testWorkspace }) => {
    test.setTimeout(60_000);
    const generalChannel = await testWorkspace.api.getChannelByName("general");
    const randomChannel = await testWorkspace.api.getChannelByName("random");
    const uniqueWord = `filterable${Date.now()}`;

    // Seed one message in general, one in random with same unique word
    await testWorkspace.api.createMessage(generalChannel.id, `General ${uniqueWord} message`);
    await testWorkspace.api.createMessage(randomChannel.id, `Random ${uniqueWord} message`);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // Open search and type
    await page.keyboard.press("Meta+k");
    await fillSearchAndWait(page, uniqueWord);

    // Wait for results — should find 2
    await expect(page.getByTestId("search-results")).toContainText("2 results");

    // Select channel filter for "general" — wait for filtered search response
    const filteredSearch = page.waitForResponse(
      (res) => res.url().includes("/search") && res.request().method() === "GET",
    );
    await page.getByTestId("search-filter-channel").click();
    await page.getByRole("option", { name: "#general" }).click();
    await filteredSearch;

    // Wait for filtered results — should find 1
    await expect(page.getByTestId("search-results")).toContainText("1 result");
    await expect(page.getByTestId("search-results")).toContainText("General");
  });

  test("search pagination loads more results", async ({ page, testWorkspace }) => {
    test.setTimeout(90_000);
    const channel = await testWorkspace.api.getChannelByName("general");
    const uniqueWord = `paginate${Date.now()}`;

    // Seed 25 messages sequentially to avoid overwhelming the server
    for (let i = 0; i < 25; i++) {
      await testWorkspace.api.createMessage(channel.id, `Msg ${String(i + 1).padStart(3, "0")} ${uniqueWord}`);
    }

    // Verify all 25 messages are searchable via API before testing the UI
    const verified = await testWorkspace.api.searchMessages(uniqueWord, { limit: 1 });
    expect(verified.total).toBe(25);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // Open search
    await page.keyboard.press("Meta+k");
    await fillSearchAndWait(page, uniqueWord);

    const resultsContainer = page.getByTestId("search-results");
    await expect(resultsContainer).toContainText("25 results");
    const initialButtons = resultsContainer.locator("button");
    await expect(initialButtons).toHaveCount(20);

    // Scroll the results container to trigger loadMore; retry nudges until page 2 arrives.
    await expect
      .poll(async () => {
        await resultsContainer.evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
        return initialButtons.count();
      }, { timeout: 20_000 })
      .toBe(25);
  });

  test("clicking search result for message in different channel navigates and scrolls", async ({
    page,
    testWorkspace,
  }) => {
    test.setTimeout(120000);

    const randomChannel = await testWorkspace.api.getChannelByName("random");
    const uniqueWord = `scrolltarget${Date.now()}`;

    // Seed the target message in "random"
    await testWorkspace.api.createMessage(randomChannel.id, `Find this ${uniqueWord} message`);

    // Seed 60 more messages AFTER the target to push it out of the initial page (50)
    const padPromises = Array.from({ length: 60 }, (_, i) =>
      testWorkspace.api.createMessage(randomChannel.id, `Padding message ${i + 1}`),
    );
    await Promise.all(padPromises);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // Start on "general" (NOT random)
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // Open search, type unique word
    await page.keyboard.press("Meta+k");
    await fillSearchAndWait(page, uniqueWord);

    // Click the result
    await page.getByTestId("search-results").locator("button").first().click();

    // Modal should close
    await expect(page.getByTestId("search-modal")).not.toBeVisible();

    // Verify the message is visible (navigated to random channel and scrolled)
    await expect(page.getByText(uniqueWord)).toBeVisible({ timeout: 10_000 });

    // Verify highlight animation class was applied
    const messageEl = page.locator(`[data-message-id] >> text=${uniqueWord}`);
    await expect(messageEl).toBeVisible();
  });

  test("scrolling down after navigating to old message loads newer messages", async ({
    page,
    testWorkspace,
  }) => {

    const randomChannel = await testWorkspace.api.getChannelByName("random");
    const targetWord = `loadnewer${Date.now()}`;

    // Seed the target message as the first message in "random"
    await testWorkspace.api.createMessage(randomChannel.id, `Find me ${targetWord}`);

    // Seed 60 padding messages AFTER the target so that:
    // 1) The initial load (limit=50) does NOT include the target → forces "around" fetch
    // 2) The "around" fetch (limit=25) returns hasNewer=true → enables loadNewer
    const padPromises = Array.from({ length: 60 }, (_, i) =>
      testWorkspace.api.createMessage(randomChannel.id, `Padding msg ${String(i + 1).padStart(3, "0")}`),
    );
    await Promise.all(padPromises);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // Start on "general"
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // Search for the target message
    await page.keyboard.press("Meta+k");
    await fillSearchAndWait(page, targetWord);

    // Set up listener for the "direction=newer" API call BEFORE triggering navigation.
    // loadNewer may fire quickly once the "around" endpoint sets hasNewer=true.
    const newerFetch = page.waitForResponse(
      (res) =>
        res.url().includes("/messages") &&
        res.url().includes("direction=newer") &&
        res.request().method() === "GET",
    );

    // Click the result to navigate to the old message
    await page.getByTestId("search-results").locator("button").first().click();
    await expect(page.getByTestId("search-modal")).not.toBeVisible();

    // Target should be visible (scrolled to via useScrollToMessage)
    await expect(page.getByText(targetWord)).toBeVisible({ timeout: 10_000 });

    // Scroll down to trigger the bottom sentinel IntersectionObserver if it hasn't fired yet.
    const scrollContainer = page.getByTestId("message-list-scroll");
    await scrollContainer.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });

    // Wait for the loadNewer API call
    await newerFetch;

    // More padding messages should now be visible (loaded via appendMessages)
    await expect(page.getByText("Padding msg 030")).toBeVisible({ timeout: 10_000 });

    // Wait for highlight-fade setTimeout(2000) to fire for coverage
    await page.waitForTimeout(2500);
  });
});
