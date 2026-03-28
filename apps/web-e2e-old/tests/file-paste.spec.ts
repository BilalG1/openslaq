import { expect } from "@playwright/test";
import { sharedTest as test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";

test.describe("File paste", () => {
  test("paste image file into editor adds it as attachment", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // Click into the editor
    await page.locator(".tiptap").click();

    // Dispatch a paste event with a File in clipboardData
    await page.evaluate(() => {
      const editor = document.querySelector(".tiptap");
      if (!editor) throw new Error("Editor not found");
      const dt = new DataTransfer();
      dt.items.add(new File(["fake image content"], "pasted-image.png", { type: "image/png" }));
      const event = new ClipboardEvent("paste", {
        clipboardData: dt,
        bubbles: true,
        cancelable: true,
      });
      editor.dispatchEvent(event);
    });

    // Verify file preview appears
    await expect(page.getByText("pasted-image.png")).toBeVisible();

    // Type message text and send
    await page.locator(".tiptap").click();
    const msg = `paste-upload-${Date.now()}`;
    await page.keyboard.type(msg);
    const sent = page.waitForResponse(
      (res) => res.url().includes("/messages") && res.request().method() === "POST" && res.status() === 201,
    );
    await page.keyboard.press("Enter");
    await sent;

    // Re-navigate to verify message with image attachment
    await page.getByText("# random").click();
    await page.locator(".tiptap").waitFor();
    const loaded = page.waitForResponse(
      (res) => res.url().includes("/messages") && res.request().method() === "GET",
    );
    await page.getByText("# general").click();
    await loaded;

    await expect(page.getByText(msg)).toBeVisible();
    await expect(page.locator("img[alt='pasted-image.png']")).toBeVisible();
  });
});
