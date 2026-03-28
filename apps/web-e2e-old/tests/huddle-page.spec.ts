import { expect } from "@playwright/test";
import { test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";

/** Navigate to the huddle page for the given channel. */
async function openHuddlePage(
  page: import("@playwright/test").Page,
  channelId: string,
  channelName: string,
) {
  await setupMockAuth(page);
  await page.goto(`/huddle/${channelId}?name=${channelName}`);
}

test.describe("Huddle page", () => {
  test("error state when join API fails", async ({
    page,
    testWorkspace,
    context,
  }) => {
    const channel = await testWorkspace.api.getChannelByName("general");

    // Mock the join endpoint to return 500
    await context.route("**/api/huddle/join", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Huddle service unavailable" }),
      }),
    );

    await openHuddlePage(page, channel.id, "general");

    // Error text and close button should be visible
    await expect(page.getByText("Huddle service unavailable")).toBeVisible();
    await expect(page.getByRole("button", { name: "Close" })).toBeVisible();
  });

  test("controls render in degraded mode", async ({
    page,
    testWorkspace,
    context,
  }) => {
    const channel = await testWorkspace.api.getChannelByName("general");

    // Mock join to succeed — LiveKit connect will fail gracefully
    await context.route("**/api/huddle/join", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          token: "mock-livekit-token",
          wsUrl: "ws://localhost:9999",
        }),
      }),
    );

    await openHuddlePage(page, channel.id, "general");

    // Channel name should be visible
    await expect(page.getByText("general")).toBeVisible();

    // All 4 controls should be visible
    await expect(page.getByTestId("huddle-mute-toggle")).toBeVisible();
    await expect(page.getByTestId("huddle-camera-toggle")).toBeVisible();
    await expect(page.getByTestId("huddle-screenshare-toggle")).toBeVisible();
    await expect(page.getByTestId("huddle-leave")).toBeVisible();
  });

  test("mute toggle changes button style", async ({
    page,
    testWorkspace,
    context,
  }) => {
    const channel = await testWorkspace.api.getChannelByName("general");

    await context.route("**/api/huddle/join", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          token: "mock-livekit-token",
          wsUrl: "ws://localhost:9999",
        }),
      }),
    );

    await openHuddlePage(page, channel.id, "general");
    await expect(page.getByTestId("huddle-mute-toggle")).toBeVisible();

    // Click mute → button should get red background (muted)
    await page.getByTestId("huddle-mute-toggle").click();
    await expect(page.getByTestId("huddle-mute-toggle")).toHaveClass(/bg-red-600/);

    // Click again → unmuted (no red)
    await page.getByTestId("huddle-mute-toggle").click();
    await expect(page.getByTestId("huddle-mute-toggle")).not.toHaveClass(/bg-red-600/);
  });

  test("screen share toggle changes button style", async ({
    page,
    testWorkspace,
    context,
  }) => {
    const channel = await testWorkspace.api.getChannelByName("general");

    await context.route("**/api/huddle/join", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          token: "mock-livekit-token",
          wsUrl: "ws://localhost:9999",
        }),
      }),
    );

    await openHuddlePage(page, channel.id, "general");
    await expect(page.getByTestId("huddle-screenshare-toggle")).toBeVisible();

    // Click → sharing active (green background)
    await page.getByTestId("huddle-screenshare-toggle").click();
    await expect(page.getByTestId("huddle-screenshare-toggle")).toHaveClass(/bg-green-600/);
  });

  test("DeviceSelector with mocked multiple audio devices", async ({
    page,
    testWorkspace,
    context,
  }) => {
    const channel = await testWorkspace.api.getChannelByName("general");

    await context.route("**/api/huddle/join", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          token: "mock-livekit-token",
          wsUrl: "ws://localhost:9999",
        }),
      }),
    );

    // Mock navigator.mediaDevices before page load
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "mediaDevices", {
        value: {
          enumerateDevices: () =>
            Promise.resolve([
              { deviceId: "d1", kind: "audioinput", label: "Microphone 1", groupId: "g1", toJSON: () => ({}) },
              { deviceId: "d2", kind: "audioinput", label: "External Mic", groupId: "g2", toJSON: () => ({}) },
            ]),
          getUserMedia: () => Promise.reject(new Error("not available")),
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        },
        configurable: true,
      });
    });

    await openHuddlePage(page, channel.id, "general");

    // DeviceSelector toggle should appear (we have multiple audio devices)
    await expect(page.getByTestId("device-selector-toggle")).toBeVisible();

    // Click to open dropdown
    await page.getByTestId("device-selector-toggle").click();

    // Verify microphone header and device labels
    await expect(page.getByText("Microphone", { exact: true })).toBeVisible();
    await expect(page.getByText("Microphone 1")).toBeVisible();
    await expect(page.getByText("External Mic")).toBeVisible();

    // Click a device → dropdown closes
    await page.getByText("External Mic").click();
    await expect(page.getByText("External Mic")).not.toBeVisible();
  });
});
