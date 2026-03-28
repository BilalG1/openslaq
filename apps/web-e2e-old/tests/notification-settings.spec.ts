import { expect } from "@playwright/test";
import { sharedTest, test, addMemberViaInvite } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";
import { SECOND_USER } from "./helpers/api";

interface NotifCall { title: string; body?: string }
interface WindowWithNotifCalls { __notifCalls__: NotifCall[]; Notification: typeof Notification; Audio: { new(): { play(): Promise<void> } } }

/** Inject a mock Notification class so the browser doesn't block permission requests. */
async function mockNotificationAPI(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    (window as unknown as Pick<WindowWithNotifCalls, "Notification">).Notification = class {
      static permission = "granted";
      static async requestPermission() {
        return "granted";
      }
      title: string;
      body?: string;
      onclick: (() => void) | null = null;
      constructor(title: string, options?: { body?: string }) {
        this.title = title;
        this.body = options?.body;
      }
      close() {}
    } as unknown as typeof Notification;
  });
}

async function openSettingsDialog(page: import("@playwright/test").Page) {
  const userButtonTrigger = page.locator(".stack-scope").first();
  await userButtonTrigger.click();
  await page.getByText("Settings", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  // Navigate to the Notifications tab
  await page.getByRole("button", { name: "Notifications" }).click();
}

async function openSettingsWithNotificationMock(
  page: import("@playwright/test").Page,
  slug: string,
) {
  await page.context().grantPermissions(["notifications"]);
  await setupMockAuth(page);
  await page.goto(`/w/${slug}`);
  await expect(page.getByText("# general")).toBeVisible();
  await mockNotificationAPI(page);
  await openSettingsDialog(page);
}

/** Helper: locate a switch by test id */
function getSwitch(page: import("@playwright/test").Page, testId: string) {
  return page.getByTestId(testId);
}

/**
 * Inject a spy Notification class that records calls to window.__notifCalls__,
 * and make the page appear hidden so notifications fire.
 */
async function mockNotificationSpy(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    const w = window as unknown as WindowWithNotifCalls;
    w.__notifCalls__ = [];
    w.Notification = class {
      static permission = "granted";
      static async requestPermission() {
        return "granted";
      }
      title: string;
      body?: string;
      onclick: (() => void) | null = null;
      constructor(title: string, options?: { body?: string }) {
        this.title = title;
        this.body = options?.body;
        (window as unknown as WindowWithNotifCalls).__notifCalls__.push({ title, body: options?.body });
      }
      close() {}
    } as unknown as typeof Notification;
    // Make the page appear hidden so notification code path triggers
    Object.defineProperty(document, "hidden", {
      get: () => true,
      configurable: true,
    });
    // Also mock Audio to prevent errors in notification sound path
    w.Audio = class {
      play() { return Promise.resolve(); }
    };
  });
}

/** Inject a Notification class with permission = "denied" so the denied branch is exercised. */
async function mockNotificationDenied(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    (window as unknown as Pick<WindowWithNotifCalls, "Notification">).Notification = class {
      static permission: NotificationPermission = "denied";
      static async requestPermission(): Promise<NotificationPermission> {
        return "denied";
      }
      title: string;
      body?: string;
      onclick: (() => void) | null = null;
      constructor(title: string, options?: { body?: string }) {
        this.title = title;
        this.body = options?.body;
      }
      close() {}
    } as unknown as typeof Notification;
  });
}

sharedTest.describe("Notification settings", () => {
  sharedTest("shows warning when notifications are blocked", async ({
    page,
    testWorkspace,
  }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await expect(page.getByText("# general")).toBeVisible();
    await mockNotificationDenied(page);
    await openSettingsDialog(page);

    await expect(
      page.getByText("Notifications are blocked in your browser settings"),
    ).toBeVisible();
  });

  sharedTest("shows notification toggles in settings dialog", async ({
    page,
    testWorkspace,
  }) => {
    await openSettingsWithNotificationMock(page, testWorkspace.slug);

    // Verify notification section exists
    await expect(page.getByText("Desktop notifications")).toBeVisible();
    await expect(page.getByText("Notification sound")).toBeVisible();

    // Verify switches exist with correct initial state
    const enabledSwitch = getSwitch(page, "notifications-enabled");
    const soundSwitch = getSwitch(page, "notifications-sound");

    await expect(enabledSwitch).not.toBeChecked();
    await expect(soundSwitch).toBeChecked();

    // Sound switch should be disabled when notifications are off
    await expect(soundSwitch).toBeDisabled();
  });

  sharedTest("toggling notifications on requests permission and enables sound toggle", async ({
    page,
    testWorkspace,
  }) => {
    await openSettingsWithNotificationMock(page, testWorkspace.slug);

    const enabledSwitch = getSwitch(page, "notifications-enabled");
    const soundSwitch = getSwitch(page, "notifications-sound");

    // Toggle notifications on
    await enabledSwitch.click();

    // Switch should now be checked
    await expect(enabledSwitch).toBeChecked();

    // Sound switch should now be enabled
    await expect(soundSwitch).toBeEnabled();

    // Toggle sound off
    await soundSwitch.click();
    await expect(soundSwitch).not.toBeChecked();

    // Toggle notifications off
    await enabledSwitch.click();
    await expect(enabledSwitch).not.toBeChecked();

    // Sound switch should be disabled again
    await expect(soundSwitch).toBeDisabled();
  });

  sharedTest("notification preferences persist across dialog reopens", async ({
    page,
    testWorkspace,
  }) => {
    await openSettingsWithNotificationMock(page, testWorkspace.slug);

    await getSwitch(page, "notifications-enabled").click();
    await expect(getSwitch(page, "notifications-enabled")).toBeChecked();

    // Reload page to test localStorage persistence
    await page.reload();
    await expect(page.getByText("# general")).toBeVisible();
    await mockNotificationAPI(page);

    // Reopen settings - state should be preserved from localStorage
    await openSettingsDialog(page);

    await expect(getSwitch(page, "notifications-enabled")).toBeChecked();
    await expect(getSwitch(page, "notifications-sound")).toBeEnabled();
  });
});

test.describe("Notification delivery", () => {
  test("notification fires when message arrives while tab is hidden", async ({
    page,
    testWorkspace,
  }) => {
    // Set up second user in the workspace
    const secondApi = await addMemberViaInvite(testWorkspace.api, SECOND_USER, testWorkspace.slug);
    const channel = await secondApi.getChannelByName("general");

    await page.context().grantPermissions(["notifications"]);
    await setupMockAuth(page);

    // Enable notifications in localStorage before loading
    await page.addInitScript(() => {
      localStorage.setItem("openslaq-notifications-enabled", "true");
      localStorage.setItem("openslaq-notifications-sound", "true");
    });

    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    // Install notification spy and make page appear hidden
    await mockNotificationSpy(page);

    // Have the second user send a message (triggers Socket.IO message:new)
    const msgContent = `notif-test-${Date.now()}`;
    await secondApi.createMessage(channel.id, msgContent);

    // Wait for the notification to fire
    await expect(async () => {
      const calls = await page.evaluate(() => (window as unknown as WindowWithNotifCalls).__notifCalls__) as NotifCall[];
      expect(calls.length).toBeGreaterThanOrEqual(1);
      const last = calls[calls.length - 1]!;
      expect(last.body).toContain(msgContent);
    }).toPass({ timeout: 10000 });
  });

  test("notification body strips markdown and truncates long messages", async ({
    page,
    testWorkspace,
  }) => {
    const secondApi = await addMemberViaInvite(testWorkspace.api, SECOND_USER, testWorkspace.slug);
    const channel = await secondApi.getChannelByName("general");

    await page.context().grantPermissions(["notifications"]);
    await setupMockAuth(page);

    await page.addInitScript(() => {
      localStorage.setItem("openslaq-notifications-enabled", "true");
      localStorage.setItem("openslaq-notifications-sound", "true");
    });

    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    await mockNotificationSpy(page);

    // Send a message with markdown — should be stripped in notification
    const ts = Date.now();
    await secondApi.createMessage(channel.id, `**bold${ts}** text`);

    await expect(async () => {
      const calls = await page.evaluate(() => (window as unknown as WindowWithNotifCalls).__notifCalls__) as NotifCall[];
      expect(calls.length).toBeGreaterThanOrEqual(1);
      const body = calls[calls.length - 1]!.body ?? "";
      // Should contain stripped text, not raw markdown
      expect(body).toContain(`bold${ts} text`);
      expect(body).not.toContain("**");
    }).toPass({ timeout: 10000 });

    // Clear calls for next sub-test
    await page.evaluate(() => { (window as unknown as WindowWithNotifCalls).__notifCalls__ = []; });

    // Send a very long message — should be truncated to 100 chars + "..."
    const longWord = `long${ts}${"x".repeat(120)}`;
    await secondApi.createMessage(channel.id, longWord);

    await expect(async () => {
      const calls = await page.evaluate(() => (window as unknown as WindowWithNotifCalls).__notifCalls__) as NotifCall[];
      expect(calls.length).toBeGreaterThanOrEqual(1);
      const body = calls[calls.length - 1]!.body ?? "";
      expect(body).toContain("...");
    }).toPass({ timeout: 10000 });
  });
});
