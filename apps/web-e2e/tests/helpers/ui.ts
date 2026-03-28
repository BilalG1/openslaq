import { expect, type Page } from "@playwright/test";
import { setupMockAuth, type MockUser } from "./mock-auth";

/**
 * Log in and navigate to a workspace channel. Call at the start of each test.
 */
export async function openWorkspaceChannel(
  page: Page,
  slug: string,
  channelName = "general",
  user?: Partial<MockUser>,
): Promise<void> {
  await page.addInitScript(() => localStorage.removeItem("openslaq-sidebar-collapse"));
  await setupMockAuth(page, user);
  await page.goto(`/w/${slug}`);
  await page.getByText(`# ${channelName}`).click();
  await expect(page.locator(".tiptap")).toBeVisible();
}

/**
 * Type a message in the TipTap editor and send via Enter.
 * Asserts the message appears in the message list (auto-retrying).
 */
export async function sendMessage(page: Page, content: string): Promise<void> {
  const editor = page.locator(".tiptap");
  await editor.click();
  await page.keyboard.type(content);
  await page.keyboard.press("Enter");
  await expect(page.getByText(content)).toBeVisible();
}
