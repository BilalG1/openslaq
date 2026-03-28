import { expect, type Page } from "@playwright/test";
import { test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";
import { refreshChannel } from "./helpers/chat-ui";

async function pickEmoji(page: Page) {
  // emoji-mart renders an <em-emoji-picker> custom element with shadow DOM.
  // Playwright CSS selectors pierce shadow DOM by default.
  // Type in the search box to find a specific emoji, then click the result.
  const searchInput = page.locator("em-emoji-picker input");
  await searchInput.fill("thumbsup");
  // Click the 👍 button that appears in search results
  await page.getByRole("button", { name: "👍" }).click();
}

test.describe("Emoji Picker", () => {
  test("add reaction via action bar emoji picker", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const msg = `emoji-picker-test-${Date.now()}`;
    await testWorkspace.api.createMessage(channel.id, msg);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.getByText(msg)).toBeVisible();

    // Hover message to reveal action bar
    await page.getByText(msg).hover();
    await expect(page.getByTestId("message-action-bar")).toBeVisible();

    // Click reaction trigger to open emoji picker
    await page.getByTestId("reaction-trigger").click();
    await expect(page.getByTestId("emoji-picker")).toBeVisible();

    // Set up response listener before the action that triggers it
    const reactionResponse = page.waitForResponse(
      (res) => res.url().includes("/reactions") && res.request().method() === "POST",
    );

    // Select an emoji from the picker
    await pickEmoji(page);

    // Wait for reaction API call
    await reactionResponse;

    // Picker should close after selection
    await expect(page.getByTestId("emoji-picker")).not.toBeVisible();

    // Refresh channel to see the reaction
    await refreshChannel(page, "general");

    // Reaction pill should be visible
    const pill = page.getByTestId("reaction-pill-👍").first();
    await expect(pill).toBeVisible();
    await expect(pill).toContainText("1");
  });

  test("add reaction via '+' button on reaction bar", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const msg = `emoji-bar-test-${Date.now()}`;
    const message = await testWorkspace.api.createMessage(channel.id, msg);

    // Seed an existing reaction so the reaction bar (with +) is visible
    await testWorkspace.api.toggleReaction(message.id, "🎉");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.getByText(msg)).toBeVisible();

    // Refresh to load the seeded reaction
    await refreshChannel(page, "general");

    // The reaction bar should be visible with the + button
    await expect(page.getByTestId("reaction-add-button").first()).toBeVisible();

    // Click the + button to open the emoji picker from the reaction bar
    await page.getByTestId("reaction-add-button").first().click();
    await expect(page.getByTestId("emoji-picker")).toBeVisible();

    // Set up response listener before the action that triggers it
    const reactionResponse2 = page.waitForResponse(
      (res) => res.url().includes("/reactions") && res.request().method() === "POST",
    );

    // Select an emoji
    await pickEmoji(page);

    // Wait for reaction API call
    await reactionResponse2;

    // Picker should close
    await expect(page.getByTestId("emoji-picker")).not.toBeVisible();

    // Refresh to see the new reaction
    await refreshChannel(page, "general");

    // Both reactions should be visible
    const thumbsPill = page.getByTestId("reaction-pill-👍").first();
    await expect(thumbsPill).toBeVisible();
    const partyPill = page.getByTestId("reaction-pill-🎉").first();
    await expect(partyPill).toBeVisible();
  });
});
