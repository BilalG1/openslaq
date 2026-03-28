import { expect } from "@playwright/test";
import { sharedTest as test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";

test.describe("Huddle UI", () => {
  test("huddle start button visible in channel header", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    await expect(page.getByTestId("huddle-start-button")).toBeVisible();
  });

  test("start huddle opens popup window with controls", async ({ page, testWorkspace, context }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    // Mock fetch for /api/huddle/join on all pages in the context
    await context.route("**/api/huddle/join", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          token: "mock-livekit-token",
          wsUrl: "ws://localhost:3004",
          roomName: "huddle-test-room",
        }),
      }),
    );

    // Wait for popup to open when clicking start
    const popupPromise = page.waitForEvent("popup");
    await page.getByTestId("huddle-start-button").click();
    const popup = await popupPromise;
    await popup.waitForLoadState();

    // Popup should have the huddle controls
    await expect(popup.getByTestId("huddle-leave")).toBeVisible();
    await expect(popup.getByTestId("huddle-mute-toggle")).toBeVisible();
    await expect(popup.getByTestId("huddle-camera-toggle")).toBeVisible();
    await expect(popup.getByTestId("huddle-screenshare-toggle")).toBeVisible();

    await popup.close();
  });

  test("closing popup leaves the huddle", async ({ page, testWorkspace, context }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    // Mock huddle join API on all pages
    await context.route("**/api/huddle/join", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          token: "mock-livekit-token",
          wsUrl: "ws://localhost:3004",
          roomName: "huddle-test-room",
        }),
      }),
    );

    const popupPromise = page.waitForEvent("popup");
    await page.getByTestId("huddle-start-button").click();
    const popup = await popupPromise;
    await popup.waitForLoadState();

    // Huddle should be in progress
    await expect(page.getByTestId("huddle-in-progress")).toBeVisible();

    // Close the popup
    await popup.close();

    // Wait for the polling interval to detect closed popup (500ms + buffer)
    await page.waitForTimeout(1000);

    // Start button should be visible again (huddle was left)
    await expect(page.getByTestId("huddle-start-button")).toBeVisible();
  });
});
