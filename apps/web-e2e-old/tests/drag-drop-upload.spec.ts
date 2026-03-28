import { expect } from "@playwright/test";
import { sharedTest as test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";

test.describe("Drag and drop upload", () => {
  test("drag over shows overlay, drag leave hides it", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // Dispatch dragenter on document (window-level listeners)
    await page.evaluate(() => {
      const dt = new DataTransfer();
      dt.items.add(new File([""], "dummy.txt", { type: "text/plain" }));
      document.dispatchEvent(new DragEvent("dragenter", { bubbles: true, cancelable: true, dataTransfer: dt }));
    });

    // Verify "Upload file" overlay appears
    await expect(page.getByText("Upload file")).toBeVisible();

    // Dispatch dragleave to hide the overlay
    await page.evaluate(() => {
      const dt = new DataTransfer();
      dt.items.add(new File([""], "dummy.txt", { type: "text/plain" }));
      document.dispatchEvent(new DragEvent("dragleave", { bubbles: true, cancelable: true, dataTransfer: dt }));
    });

    // Verify overlay disappears
    await expect(page.getByText("Upload file")).not.toBeVisible();
  });

  test("drop file adds it as attachment", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // Dispatch drop event on the main content area
    await page.evaluate(() => {
      const mainContent = document.querySelector("[data-testid='main-content']");
      if (!mainContent) throw new Error("Main content area not found");
      const dt = new DataTransfer();
      dt.items.add(new File(["hello world"], "dropped-file.txt", { type: "text/plain" }));
      mainContent.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
    });

    // Verify file preview appears
    await expect(page.getByText("dropped-file.txt")).toBeVisible();

    // Send message with the dropped file
    const editor = page.locator(".tiptap");
    await editor.click();
    const msg = `drop-upload-${Date.now()}`;
    await page.keyboard.type(msg);
    const sent = page.waitForResponse(
      (res) => res.url().includes("/messages") && res.request().method() === "POST" && res.status() === 201,
    );
    await page.keyboard.press("Enter");
    await sent;

    // Navigate away and back to verify the message persisted
    await page.getByText("# random").click();
    await page.locator(".tiptap").waitFor();
    const loaded = page.waitForResponse(
      (res) => res.url().includes("/messages") && res.request().method() === "GET",
    );
    await page.getByText("# general").click();
    await loaded;

    await expect(page.getByText(msg)).toBeVisible();
    const downloadLink = page.locator("[data-testid='file-download-link']").filter({ hasText: "dropped-file.txt" });
    await expect(downloadLink).toBeVisible();
  });
});
