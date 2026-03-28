import { expect } from "@playwright/test";
import { sharedTest as test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";

/** Minimal valid 1×1 PNG buffer for file upload tests. */
const PNG_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
  "base64",
);

/** Helper: open the user settings dialog */
async function openSettings(page: import("@playwright/test").Page) {
  const userButtonTrigger = page.locator(".stack-scope").first();
  await userButtonTrigger.click();
  await page.getByText("Settings", { exact: true }).click();
  // Dialog title is now "Settings" with vertical tabs; Profile tab is default
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
}

test.describe("User settings dialog", () => {
  test("open settings dialog, verify fields, edit display name", async ({ page, testWorkspace }) => {
    const mockUser = await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await expect(page.getByText("# general")).toBeVisible();

    await openSettings(page);

    // Verify email is shown (read-only)
    const email = page.getByTestId("settings-email");
    await expect(email).toHaveText(mockUser.email);

    // Verify display name input has current value
    const nameInput = page.getByTestId("settings-display-name");
    await expect(nameInput).toHaveValue(mockUser.displayName);

    // Edit display name
    await nameInput.clear();
    await nameInput.fill("New Display Name");

    // Save button should be enabled now
    const saveBtn = page.getByTestId("settings-save-name");
    await expect(saveBtn).toBeEnabled();

    // Close the dialog
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Settings" })).not.toBeVisible();
  });

  test("click avatar opens file chooser", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await expect(page.getByText("# general")).toBeVisible();

    await openSettings(page);

    // Click avatar upload button and verify file chooser opens
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByTestId("avatar-upload-button").click();
    const fileChooser = await fileChooserPromise;
    expect(fileChooser).toBeTruthy();
  });

  test("upload image shows crop UI, cancel returns to avatar", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await expect(page.getByText("# general")).toBeVisible();

    await openSettings(page);

    // Upload an image via the avatar button
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByTestId("avatar-upload-button").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "avatar.png",
      mimeType: "image/png",
      buffer: PNG_BUFFER,
    });

    // Crop UI should appear: zoom slider, Save, Cancel buttons
    await expect(page.getByRole("slider", { name: "Zoom" })).toBeVisible();
    // Use .first() because settings-save-name button is also named "Save"
    await expect(page.getByRole("button", { name: "Save" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" }).first()).toBeVisible();

    // Click Cancel — crop UI goes away, avatar button comes back
    await page.getByRole("button", { name: "Cancel" }).first().click();
    await expect(page.getByRole("slider", { name: "Zoom" })).not.toBeVisible();
    await expect(page.getByTestId("avatar-upload-button")).toBeVisible();
  });

  test("upload image, crop, and save updates avatar", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await expect(page.getByText("# general")).toBeVisible();

    await openSettings(page);

    // Upload an image
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByTestId("avatar-upload-button").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "avatar.png",
      mimeType: "image/png",
      buffer: PNG_BUFFER,
    });

    // Wait for crop UI to fully render (zoom slider proves crop mode is active)
    await expect(page.getByRole("slider", { name: "Zoom" })).toBeVisible();
    await expect(page.getByTestId("crop-save")).toBeVisible();

    // Intercept PATCH to /api/users/me to verify avatar payload
    const patchPromise = page.waitForRequest(
      (req) => req.url().includes("/api/users/me") && req.method() === "PATCH",
    );

    // Click the crop Save button
    await page.getByTestId("crop-save").click();

    // Verify the PATCH was sent with an avatarUrl (base64 data URL)
    const patchReq = await patchPromise;
    const body = patchReq.postDataJSON();
    expect(body.avatarUrl).toBeTruthy();
    expect(body.avatarUrl).toContain("data:");

    // Crop UI should close
    await expect(page.getByRole("slider", { name: "Zoom" })).not.toBeVisible();
  });

  test("edit display name and save calls API", async ({ page, testWorkspace }) => {
    const mockUser = await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await expect(page.getByText("# general")).toBeVisible();

    await openSettings(page);

    const nameInput = page.getByTestId("settings-display-name");
    await expect(nameInput).toHaveValue(mockUser.displayName);

    // Edit display name
    await nameInput.clear();
    const newName = `Renamed-${Date.now()}`;
    await nameInput.fill(newName);

    // Intercept PATCH to verify displayName payload
    const patchPromise = page.waitForRequest(
      (req) => req.url().includes("/api/users/me") && req.method() === "PATCH",
    );

    await page.getByTestId("settings-save-name").click();

    const patchReq = await patchPromise;
    const body = patchReq.postDataJSON();
    expect(body.displayName).toBe(newName);
  });
});
