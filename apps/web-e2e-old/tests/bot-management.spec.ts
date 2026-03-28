import { expect } from "@playwright/test";
import { test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";
import { openWorkspaceSettings } from "./helpers/chat-ui";

/**
 * Navigate to the workspace, open the settings dialog, and return the page
 * positioned at the "Bots" section.
 */
async function openBotSettings(
  page: import("@playwright/test").Page,
  slug: string,
  name: string,
) {
  await setupMockAuth(page);
  await page.goto(`/w/${slug}`);
  await expect(page.getByText("# general")).toBeVisible();
  await openWorkspaceSettings(page, name);
}

test.describe("Bot management", () => {
  test("owner sees Bots section with Add Bot button", async ({
    page,
    testWorkspace,
  }) => {
    await openBotSettings(page, testWorkspace.slug, testWorkspace.name);
    await expect(page.getByTestId("add-bot-btn")).toBeVisible();
    await expect(page.getByText(/^Bots \(\d+\)$/)).toBeVisible();
  });

  test("Create Bot submit disabled when required fields empty", async ({
    page,
    testWorkspace,
  }) => {
    await openBotSettings(page, testWorkspace.slug, testWorkspace.name);
    await page.getByTestId("add-bot-btn").click();
    await expect(page.getByRole("heading", { name: "Add Bot" })).toBeVisible();

    // Initially disabled — name and webhook both empty
    await expect(page.getByTestId("create-bot-submit")).toBeDisabled();

    // Fill only name → still disabled (webhook missing)
    await page.getByTestId("bot-name-input").fill("Test Bot");
    await expect(page.getByTestId("create-bot-submit")).toBeDisabled();

    // Clear name, fill only webhook → still disabled (name missing)
    await page.getByTestId("bot-name-input").fill("");
    await page.getByTestId("bot-webhook-input").fill("https://example.com/wh");
    await expect(page.getByTestId("create-bot-submit")).toBeDisabled();
  });

  test("creates bot and shows token reveal with copy", async ({
    page,
    testWorkspace,
  }) => {
    await openBotSettings(page, testWorkspace.slug, testWorkspace.name);
    await page.getByTestId("add-bot-btn").click();

    // Fill required fields
    await page.getByTestId("bot-name-input").fill("E2E Bot");
    await page.getByTestId("bot-webhook-input").fill("https://example.com/hook");

    // Submit
    const createResponse = page.waitForResponse(
      (res) => res.url().includes("/bots") && res.request().method() === "POST" && res.status() === 201,
    );
    await page.getByTestId("create-bot-submit").click();
    await createResponse;

    // Token reveal screen
    await expect(page.getByTestId("bot-api-token")).toBeVisible();
    await expect(page.getByText("Save this API token now")).toBeVisible();

    // Copy button
    await page.context().grantPermissions(["clipboard-write"]);
    await page.getByTestId("copy-token-btn").click();
    await expect(page.getByText("Copied!")).toBeVisible();

    // Close → bot appears in list
    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByText("E2E Bot")).toBeVisible();
  });

  test("scope and event checkbox toggling", async ({
    page,
    testWorkspace,
  }) => {
    await openBotSettings(page, testWorkspace.slug, testWorkspace.name);
    await page.getByTestId("add-bot-btn").click();

    // Verify defaults: chat:write, chat:read checked; message:new checked
    await expect(page.getByTestId("scope-chat:read")).toBeChecked();
    await expect(page.getByTestId("scope-chat:write")).toBeChecked();
    await expect(page.getByTestId("event-message:new")).toBeChecked();

    // Uncheck chat:read
    await page.getByTestId("scope-chat:read").click();
    await expect(page.getByTestId("scope-chat:read")).not.toBeChecked();

    // Check channels:read
    await page.getByTestId("scope-channels:read").click();
    await expect(page.getByTestId("scope-channels:read")).toBeChecked();

    // Toggle an event
    await page.getByTestId("event-reaction:updated").click();
    await expect(page.getByTestId("event-reaction:updated")).toBeChecked();

    // Uncheck the default event
    await page.getByTestId("event-message:new").click();
    await expect(page.getByTestId("event-message:new")).not.toBeChecked();
  });

  test("configure dialog pre-populates and saves edits", async ({
    page,
    testWorkspace,
  }) => {
    await openBotSettings(page, testWorkspace.slug, testWorkspace.name);

    // Create a bot first
    await page.getByTestId("add-bot-btn").click();
    await page.getByTestId("bot-name-input").fill("Config Bot");
    await page.getByTestId("bot-webhook-input").fill("https://example.com/wh");
    const created = page.waitForResponse(
      (res) => res.url().includes("/bots") && res.request().method() === "POST" && res.status() === 201,
    );
    await page.getByTestId("create-bot-submit").click();
    await created;
    await page.getByRole("button", { name: "Done" }).click();

    // Open configure dialog
    const configureBtn = page.locator("[data-testid^='configure-bot-']").first();
    await configureBtn.click();
    await expect(page.getByText("Configure Bot: Config Bot")).toBeVisible();

    // Verify pre-populated name
    await expect(page.getByTestId("bot-name-input")).toHaveValue("Config Bot");

    // Edit name
    await page.getByTestId("bot-name-input").fill("Renamed Bot");

    // Save
    const saved = page.waitForResponse(
      (res) => res.url().includes("/bots/") && res.request().method() === "PUT",
    );
    await page.getByTestId("save-bot-btn").click();
    await saved;

    // Verify updated name in list
    await expect(page.getByText("Renamed Bot")).toBeVisible();
  });

  test("regenerate token", async ({ page, testWorkspace }) => {
    await openBotSettings(page, testWorkspace.slug, testWorkspace.name);

    // Create a bot first
    await page.getByTestId("add-bot-btn").click();
    await page.getByTestId("bot-name-input").fill("Regen Bot");
    await page.getByTestId("bot-webhook-input").fill("https://example.com/wh");
    const created = page.waitForResponse(
      (res) => res.url().includes("/bots") && res.request().method() === "POST" && res.status() === 201,
    );
    await page.getByTestId("create-bot-submit").click();
    await created;
    await page.getByRole("button", { name: "Done" }).click();

    // Open configure
    await page.locator("[data-testid^='configure-bot-']").first().click();
    await expect(page.getByTestId("regenerate-token-btn")).toBeVisible();

    // Accept the confirm dialog
    page.on("dialog", (d) => void d.accept());

    // Click regenerate
    const regen = page.waitForResponse(
      (res) => res.url().includes("regenerate-token") && res.request().method() === "POST",
    );
    await page.getByTestId("regenerate-token-btn").click();
    await regen;

    // Copy button should appear (token replaced the regenerate button)
    await expect(page.getByRole("button", { name: "Copy" })).toBeVisible();
  });

  test("delete bot", async ({ page, testWorkspace }) => {
    await openBotSettings(page, testWorkspace.slug, testWorkspace.name);

    // Create a bot first
    await page.getByTestId("add-bot-btn").click();
    await page.getByTestId("bot-name-input").fill("Delete Me Bot");
    await page.getByTestId("bot-webhook-input").fill("https://example.com/wh");
    const created = page.waitForResponse(
      (res) => res.url().includes("/bots") && res.request().method() === "POST" && res.status() === 201,
    );
    await page.getByTestId("create-bot-submit").click();
    await created;
    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByText("Delete Me Bot")).toBeVisible();

    // Open configure
    await page.locator("[data-testid^='configure-bot-']").first().click();

    // Accept the confirm dialog
    page.on("dialog", (d) => void d.accept());

    // Delete
    const deleted = page.waitForResponse(
      (res) => res.url().includes("/bots/") && res.request().method() === "DELETE",
    );
    await page.getByTestId("delete-bot-btn").click();
    await deleted;

    // Bot should be removed from the list
    await expect(page.getByText("Delete Me Bot")).not.toBeVisible();
  });
});
