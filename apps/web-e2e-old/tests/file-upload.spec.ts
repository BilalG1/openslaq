import { expect, type Page } from "@playwright/test";
import { sharedTest as test } from "./helpers/test-workspace";
import { openWorkspaceChannel, refreshChannel, sendMessageAndWait } from "./helpers/chat-ui";

interface UploadFilePayload {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

async function attachFiles(page: Page, files: UploadFilePayload | UploadFilePayload[]) {
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Attach file" }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(files);
}

test.describe("File Upload", () => {
  test("attach button is visible in editor toolbar", async ({ page, testWorkspace }) => {
    await openWorkspaceChannel(page, testWorkspace.slug);

    const attachBtn = page.getByRole("button", { name: "Attach file" });
    await expect(attachBtn).toBeVisible();
  });

  test("upload and send image file", async ({ page, testWorkspace }) => {
    await openWorkspaceChannel(page, testWorkspace.slug);

    // Create a small PNG buffer (1x1 red pixel)
    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
      "base64",
    );
    await attachFiles(page, {
      name: "test-image.png",
      mimeType: "image/png",
      buffer: pngBuffer,
    });

    // Verify file preview appears
    await expect(page.getByText("test-image.png")).toBeVisible();

    // Send message with file
    const msg = `img-upload-${Date.now()}`;
    await sendMessageAndWait(page, msg);

    await refreshChannel(page, "general");

    // Verify inline image appears
    await expect(page.getByText(msg)).toBeVisible();
    await expect(page.locator("img[alt='test-image.png']")).toBeVisible();
  });

  test("upload and send non-image file shows download link", async ({ page, testWorkspace }) => {
    await openWorkspaceChannel(page, testWorkspace.slug);
    await attachFiles(page, {
      name: "document.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("hello world"),
    });

    await expect(page.getByText("document.txt")).toBeVisible();

    // Send
    const msg = `txt-upload-${Date.now()}`;
    await sendMessageAndWait(page, msg);

    await refreshChannel(page, "general");

    // Verify download link
    await expect(page.getByText(msg)).toBeVisible();
    const downloadLink = page.locator("[data-testid='file-download-link']").filter({ hasText: "document.txt" });
    await expect(downloadLink).toBeVisible();
  });

  test("remove pending file before send", async ({ page, testWorkspace }) => {
    await openWorkspaceChannel(page, testWorkspace.slug);
    await attachFiles(page, {
      name: "removeme.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("remove me"),
    });

    // Verify preview is shown
    await expect(page.getByText("removeme.txt")).toBeVisible();

    // Click remove button
    await page.getByRole("button", { name: "Remove file" }).click();

    // Verify preview is gone
    await expect(page.getByText("removeme.txt")).not.toBeVisible();
  });

  test("multiple file attachments", async ({ page, testWorkspace }) => {
    await openWorkspaceChannel(page, testWorkspace.slug);
    await attachFiles(page, [
      { name: "file1.txt", mimeType: "text/plain", buffer: Buffer.from("file one") },
      { name: "file2.txt", mimeType: "text/plain", buffer: Buffer.from("file two") },
    ]);

    // Both previews visible
    await expect(page.getByText("file1.txt")).toBeVisible();
    await expect(page.getByText("file2.txt")).toBeVisible();

    // Send
    const msg = `multi-${Date.now()}`;
    await sendMessageAndWait(page, msg);

    await refreshChannel(page, "general");

    // Verify both download links appear
    await expect(page.getByText(msg)).toBeVisible();
    const links = page.locator("[data-testid='file-download-link']");
    await expect(links.filter({ hasText: "file1.txt" })).toBeVisible();
    await expect(links.filter({ hasText: "file2.txt" })).toBeVisible();
  });

  test("upload and send video file renders video player", async ({ page, testWorkspace }) => {
    await openWorkspaceChannel(page, testWorkspace.slug);

    // Create a minimal valid mp4 buffer (ftyp box only — enough for MIME detection)
    const ftyp = Buffer.from([
      0x00, 0x00, 0x00, 0x14, // box size: 20 bytes
      0x66, 0x74, 0x79, 0x70, // 'ftyp'
      0x69, 0x73, 0x6f, 0x6d, // major_brand: 'isom'
      0x00, 0x00, 0x00, 0x01, // minor_version: 1
      0x69, 0x73, 0x6f, 0x6d, // compatible_brand: 'isom'
    ]);

    await attachFiles(page, {
      name: "test-video.mp4",
      mimeType: "video/mp4",
      buffer: ftyp,
    });

    await expect(page.getByText("test-video.mp4")).toBeVisible();

    const msg = `vid-upload-${Date.now()}`;
    await sendMessageAndWait(page, msg);

    await refreshChannel(page, "general");

    await expect(page.getByText(msg)).toBeVisible();
    await expect(page.locator("video")).toBeVisible();
  });
});
