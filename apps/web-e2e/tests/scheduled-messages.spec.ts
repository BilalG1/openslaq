import { expect } from "@playwright/test";
import { test } from "./helpers/test-workspace";
import { openWorkspaceChannel } from "./helpers/chat-ui";

test.describe("Scheduled messages", () => {
  test("sidebar shows Scheduled link", async ({ page, testWorkspace }) => {
    await openWorkspaceChannel(page, testWorkspace.slug);

    await expect(page.getByTestId("scheduled-view-link")).toBeVisible();
    await expect(page.getByTestId("scheduled-view-link")).toContainText("Scheduled");
  });

  test("navigate to scheduled view → shows empty state", async ({ page, testWorkspace }) => {
    await openWorkspaceChannel(page, testWorkspace.slug);

    await page.getByTestId("scheduled-view-link").click();

    await expect(page.getByTestId("scheduled-messages-view")).toBeVisible();
    await expect(page.getByTestId("scheduled-empty-state")).toBeVisible();
    await expect(page.getByText("No scheduled messages")).toBeVisible();
  });

  test("send button shows schedule dropdown", async ({ page, testWorkspace }) => {
    await openWorkspaceChannel(page, testWorkspace.slug);

    // Type some text so the send button area is active
    const editor = page.locator(".tiptap");
    await editor.click();
    await page.keyboard.type("test message");

    // Schedule chevron button should be visible
    await expect(page.getByTestId("schedule-send-button")).toBeVisible();
  });

  test("schedule button opens dialog with presets", async ({ page, testWorkspace }) => {
    await openWorkspaceChannel(page, testWorkspace.slug);

    // Type some text
    const editor = page.locator(".tiptap");
    await editor.click();
    await page.keyboard.type("scheduled content");

    // Click schedule chevron button - opens dialog directly
    await page.getByTestId("schedule-send-button").click();

    // Dialog should open with schedule presets
    await expect(page.getByTestId("schedule-message-dialog")).toBeVisible();
    await expect(page.getByText("Schedule message")).toBeVisible();
    await expect(page.getByText("In 20 minutes")).toBeVisible();
    await expect(page.getByText("In 1 hour")).toBeVisible();
    await expect(page.getByText("Custom time")).toBeVisible();
  });

  test("schedule a message with preset time", async ({ page, testWorkspace }) => {
    await openWorkspaceChannel(page, testWorkspace.slug);

    // Type content
    const editor = page.locator(".tiptap");
    await editor.click();
    await page.keyboard.type("my scheduled msg");

    // Open schedule dialog
    await page.getByTestId("schedule-send-button").click();
    await expect(page.getByTestId("schedule-message-dialog")).toBeVisible();

    // Click "In 20 minutes" preset
    const presetResponse = page.waitForResponse(
      (res) => res.url().includes("/scheduled-messages") && res.request().method() === "POST" && res.status() === 201,
    );
    await page.getByTestId("schedule-preset-in-20-minutes").click();
    await presetResponse;

    // Editor should be cleared (remounted)
    await expect(page.locator(".tiptap")).toBeVisible();

    // Navigate to scheduled view to confirm it appears
    await page.getByTestId("scheduled-view-link").click();
    await expect(page.getByTestId("scheduled-messages-view")).toBeVisible();
    await expect(page.getByText("my scheduled msg")).toBeVisible();
  });

  test("delete a scheduled message", async ({ page, testWorkspace }) => {
    await openWorkspaceChannel(page, testWorkspace.slug);

    // Schedule a message first
    const editor = page.locator(".tiptap");
    await editor.click();
    await page.keyboard.type("to be deleted");

    await page.getByTestId("schedule-send-button").click();
    await expect(page.getByTestId("schedule-message-dialog")).toBeVisible();

    const createResponse = page.waitForResponse(
      (res) => res.url().includes("/scheduled-messages") && res.request().method() === "POST" && res.status() === 201,
    );
    await page.getByTestId("schedule-preset-in-20-minutes").click();
    await createResponse;

    // Go to scheduled view
    await page.getByTestId("scheduled-view-link").click();
    await expect(page.getByTestId("scheduled-messages-view")).toBeVisible();
    await expect(page.getByText("to be deleted")).toBeVisible();

    // Click delete
    const deleteResponse = page.waitForResponse(
      (res) => res.url().includes("/scheduled-messages") && res.request().method() === "DELETE",
    );
    await page.locator("[data-testid^='delete-scheduled-']").first().click();
    await deleteResponse;

    // Empty state should appear
    await expect(page.getByTestId("scheduled-empty-state")).toBeVisible();
  });

  test("edit a scheduled message", async ({ page, testWorkspace }) => {
    await openWorkspaceChannel(page, testWorkspace.slug);

    // Schedule a message
    const editor = page.locator(".tiptap");
    await editor.click();
    await page.keyboard.type("original content");

    await page.getByTestId("schedule-send-button").click();
    await expect(page.getByTestId("schedule-message-dialog")).toBeVisible();

    const createResponse = page.waitForResponse(
      (res) => res.url().includes("/scheduled-messages") && res.request().method() === "POST" && res.status() === 201,
    );
    await page.getByTestId("schedule-preset-in-20-minutes").click();
    await createResponse;

    // Go to scheduled view
    await page.getByTestId("scheduled-view-link").click();
    await expect(page.getByTestId("scheduled-messages-view")).toBeVisible();
    await expect(page.getByText("original content")).toBeVisible();

    // Click edit
    await page.locator("[data-testid^='edit-scheduled-']").first().click();

    // Edit textarea should appear
    const textarea = page.getByTestId("edit-scheduled-content");
    await expect(textarea).toBeVisible();
    await textarea.fill("updated content");

    // Save
    const saveResponse = page.waitForResponse(
      (res) => res.url().includes("/scheduled-messages") && res.request().method() === "PUT",
    );
    await page.getByTestId("save-edit-scheduled").click();
    await saveResponse;

    // Updated content should appear
    await expect(page.getByText("updated content")).toBeVisible();
  });
});
