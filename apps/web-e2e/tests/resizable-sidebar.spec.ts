import { expect, type Page } from "@playwright/test";
import { sharedTest as test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";

async function dragHandle(page: Page, testId: string, deltaX: number) {
  const handle = page.getByTestId(testId);
  const box = await handle.boundingBox();
  if (!box) throw new Error(`Handle ${testId} not found`);
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY, { steps: 10 });
  await page.mouse.up();
}

test.describe("Resizable Sidebars", () => {
  test("left sidebar drag resize increases width", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await expect(page.getByText("# general")).toBeVisible();

    const handle = page.getByTestId("resize-handle-left");
    await expect(handle).toBeVisible();

    // Get initial sidebar width
    const sidebar = page.locator("[data-testid='resize-handle-left']").locator("..");
    const sidebarChild = sidebar.locator("> :first-child");
    const initialBox = await sidebarChild.boundingBox();
    if (!initialBox) throw new Error("Sidebar not found");

    // Drag right to increase
    await dragHandle(page, "resize-handle-left", 50);

    const newBox = await sidebarChild.boundingBox();
    if (!newBox) throw new Error("Sidebar not found after drag");
    expect(newBox.width).toBeGreaterThan(initialBox.width + 20);
  });

  test("right sidebar drag resize increases width", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    await testWorkspace.api.createMessage(channel.id, `resize-thread-${Date.now()}`);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await expect(page.getByText("# general")).toBeVisible();
    await page.getByRole("button", { name: "# general" }).click();

    await expect(page.getByText("resize-thread-").first()).toBeVisible();
    await page.getByText("resize-thread-").first().hover();
    await page.getByTestId("reply-action-trigger").first().click();
    await expect(page.getByTestId("thread-panel")).toBeVisible();

    const threadPanel = page.getByTestId("thread-panel");
    const initialBox = await threadPanel.boundingBox();
    if (!initialBox) throw new Error("Thread panel not found");

    // Drag left to increase right panel width
    await dragHandle(page, "resize-handle-right", -60);

    const newBox = await threadPanel.boundingBox();
    if (!newBox) throw new Error("Thread panel not found after drag");
    expect(newBox.width).toBeGreaterThan(initialBox.width + 20);
  });

  test("left sidebar respects min/max constraints", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await expect(page.getByText("# general")).toBeVisible();

    const sidebarChild = page.locator("[data-testid='resize-handle-left']").locator("..").locator("> :first-child");

    // Drag far left — should not go below 200px
    await dragHandle(page, "resize-handle-left", -300);
    const minBox = await sidebarChild.boundingBox();
    if (!minBox) throw new Error("Sidebar not found");
    expect(minBox.width).toBeGreaterThanOrEqual(199); // allow 1px rounding

    // Drag far right — should not exceed 400px
    await dragHandle(page, "resize-handle-left", 500);
    const maxBox = await sidebarChild.boundingBox();
    if (!maxBox) throw new Error("Sidebar not found");
    expect(maxBox.width).toBeLessThanOrEqual(401); // allow 1px rounding
  });

  test("left sidebar width persists on reload", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await expect(page.getByText("# general")).toBeVisible();

    // Drag to increase width
    await dragHandle(page, "resize-handle-left", 80);

    const sidebarChild = page.locator("[data-testid='resize-handle-left']").locator("..").locator("> :first-child");
    const beforeReload = await sidebarChild.boundingBox();
    if (!beforeReload) throw new Error("Sidebar not found");

    // Reload
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText("# general")).toBeVisible();

    const afterReload = await sidebarChild.boundingBox();
    if (!afterReload) throw new Error("Sidebar not found after reload");
    expect(Math.abs(afterReload.width - beforeReload.width)).toBeLessThan(5);
  });

  test("right sidebar width persists on reopen", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    await testWorkspace.api.createMessage(channel.id, `persist-thread-${Date.now()}`);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await expect(page.getByText("# general")).toBeVisible();
    await page.getByRole("button", { name: "# general" }).click();

    await expect(page.getByText("persist-thread-").first()).toBeVisible();
    await page.getByText("persist-thread-").first().hover();
    await page.getByTestId("reply-action-trigger").first().click();
    await expect(page.getByTestId("thread-panel")).toBeVisible();

    // Drag to resize
    await dragHandle(page, "resize-handle-right", -60);
    const threadPanel = page.getByTestId("thread-panel");
    const resizedBox = await threadPanel.boundingBox();
    if (!resizedBox) throw new Error("Thread panel not found");

    // Close thread
    await page.getByTestId("thread-close").click();
    await expect(page.getByTestId("thread-panel")).not.toBeVisible();

    // Reopen thread
    await page.getByText("persist-thread-").first().hover();
    await page.getByTestId("reply-action-trigger").first().click();
    await expect(page.getByTestId("thread-panel")).toBeVisible();

    const reopenedBox = await threadPanel.boundingBox();
    if (!reopenedBox) throw new Error("Thread panel not found after reopen");
    expect(Math.abs(reopenedBox.width - resizedBox.width)).toBeLessThan(5);
  });
});
