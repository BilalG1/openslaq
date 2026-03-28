import { expect } from "@playwright/test";
import { test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";

test.describe("Message edit and delete", () => {
  test("edit own message", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");

    const original = `edit-original-${Date.now()}`;
    const updated = `edit-updated-${Date.now()}`;
    const msg = await testWorkspace.api.createMessage(channel.id, original);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    // Verify original message is visible
    await expect(page.getByText(original)).toBeVisible();

    // Edit the message via API — should update in real-time via socket
    await testWorkspace.api.editMessage(msg.id, updated);

    // Updated content should be visible, original should not (allow time for socket delivery under load)
    await expect(page.getByText(updated)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(original)).not.toBeVisible();
  });

  test("delete own message", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");

    const content = `delete-me-${Date.now()}`;
    const msg = await testWorkspace.api.createMessage(channel.id, content);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    // Verify message is visible
    await expect(page.getByText(content)).toBeVisible();

    // Delete the message via API — should disappear in real-time via socket
    await testWorkspace.api.deleteMessage(msg.id);

    await expect(page.getByText(content)).not.toBeVisible({ timeout: 10000 });
  });

  test("edit message via inline UI", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const original = `inline-edit-${Date.now()}`;
    const updated = `inline-updated-${Date.now()}`;
    await testWorkspace.api.createMessage(channel.id, original);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.getByText(original)).toBeVisible();

    // Hover the message to reveal action bar
    await page.getByText(original).hover();
    await expect(page.getByTestId("message-action-bar")).toBeVisible();

    // Click overflow menu
    await page.getByTestId("message-overflow-menu").click();
    await expect(page.getByTestId("message-overflow-dropdown")).toBeVisible();

    // Click edit
    await page.getByTestId("edit-message-action").click();

    // Edit input should appear
    const editInput = page.getByTestId("edit-message-input");
    await expect(editInput).toBeVisible();
    await editInput.fill(updated);

    // Save with Enter
    const editResponse = page.waitForResponse(
      (res) => res.url().includes("/messages/") && res.request().method() === "PUT",
    );
    await editInput.press("Enter");
    await editResponse;

    // Verify updated content
    await expect(page.getByText(updated)).toBeVisible();
  });

  test("cancel inline edit with Escape", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const content = `cancel-edit-${Date.now()}`;
    await testWorkspace.api.createMessage(channel.id, content);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.getByText(content)).toBeVisible();

    // Hover and open edit
    await page.getByText(content).hover();
    await page.getByTestId("message-overflow-menu").click();
    await page.getByTestId("edit-message-action").click();

    const editInput = page.getByTestId("edit-message-input");
    await expect(editInput).toBeVisible();

    // Cancel with Escape
    await editInput.press("Escape");

    // Edit input should be gone, original content visible
    await expect(editInput).not.toBeVisible();
    await expect(page.getByText(content)).toBeVisible();
  });

  test("delete message via inline UI", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const content = `inline-delete-${Date.now()}`;
    await testWorkspace.api.createMessage(channel.id, content);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.getByText(content)).toBeVisible();

    // Hover the message
    await page.getByText(content).hover();

    // Click overflow menu then delete
    await page.getByTestId("message-overflow-menu").click();
    const deleteResponse = page.waitForResponse(
      (res) => res.url().includes("/messages/") && res.request().method() === "DELETE",
    );
    await page.getByTestId("delete-message-action").click();
    await deleteResponse;

    // Message should be gone
    await expect(page.getByText(content)).not.toBeVisible({ timeout: 10000 });
  });
});
