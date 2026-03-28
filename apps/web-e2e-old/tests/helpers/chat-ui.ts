import { expect, type Page } from "@playwright/test";
import { setupMockAuth, type MockUser } from "./mock-auth";

export async function openWorkspaceChannel(
  page: Page,
  slug: string,
  channelName = "general",
  user?: Partial<MockUser>,
): Promise<void> {
  // Clear sidebar collapse state that may persist from other tests in same worker
  await page.addInitScript(() => localStorage.removeItem("openslaq-sidebar-collapse"));
  await setupMockAuth(page, user);
  await page.goto(`/w/${slug}`);
  await page.getByText(`# ${channelName}`).click();
  await expect(page.locator(".tiptap")).toBeVisible();
}

export async function refreshChannel(page: Page, channelName: string): Promise<void> {
  const other = channelName === "general" ? "random" : "general";
  await page.getByText(`# ${other}`).click();
  await page.locator(".tiptap").waitFor();
  const loaded = page.waitForResponse(
    (res) => res.url().includes("/messages") && res.request().method() === "GET",
  );
  await page.getByText(`# ${channelName}`).click();
  await loaded;
}

export async function openWorkspaceSettings(page: Page, name: string): Promise<void> {
  // Open the Radix workspace dropdown in the sidebar
  await page.locator("button", { hasText: name }).first().click();
  await page.getByRole("menuitem", { name: "Settings" }).click();
  // Wait for the dialog to load its content
  await expect(page.getByText(/^Members \(\d+\)$/)).toBeVisible();
}

export async function sendMessageAndWait(page: Page, content: string): Promise<void> {
  const editor = page.locator(".tiptap");
  await editor.click();
  await page.keyboard.type(content);
  const sent = page.waitForResponse(
    (res) => res.url().includes("/messages") && res.request().method() === "POST" && res.status() === 201,
  );
  await page.keyboard.press("Enter");
  await sent;
}
