import { by, device, element, expect, waitFor } from "detox";
import {
  signTestJwt,
  createTestChannel,
  createTestWorkspace,
  deleteTestWorkspace,
  getWorkspaceChannels,
  sendTestMessage,
  sendTestReply,
  defaultUser,
} from "./helpers/api";
import { launchApp, screenshot } from "./helpers/setup";

describe("Notification deep links", () => {
  let token: string;
  let workspace: { id: string; name: string; slug: string };
  let generalChannelId: string;
  let extraChannel: { id: string; name: string };
  let parentMessage: { id: string; content: string };

  beforeAll(async () => {
    token = await signTestJwt();
    workspace = await createTestWorkspace(token);

    // Create an extra channel for channel-specific navigation
    extraChannel = await createTestChannel(
      token,
      workspace.slug,
      "notif-test",
      "public",
    );

    // Get #general
    const channels = await getWorkspaceChannels(token, workspace.slug);
    const general = channels.find((c) => c.name === "general");
    if (!general) throw new Error("No #general channel found");
    generalChannelId = general.id;

    // Create a thread parent + reply in #general
    parentMessage = await sendTestMessage(
      token,
      workspace.slug,
      generalChannelId,
      `Thread for notification test ${Date.now()}`,
    );
    await sendTestReply(
      token,
      workspace.slug,
      generalChannelId,
      parentMessage.id,
      `Reply in thread ${Date.now()}`,
    );

    // Send a message in the extra channel
    await sendTestMessage(
      token,
      workspace.slug,
      extraChannel.id,
      `Message in notif-test ${Date.now()}`,
    );

    await launchApp(token, defaultUser.id, workspace.slug);
  });

  afterAll(async () => {
    if (workspace) {
      await deleteTestWorkspace(token, workspace.slug);
    }
  });

  afterEach(async () => {
    await device.enableSynchronization();
  });

  it("foreground notification tap navigates to channel", async () => {
    // Verify we're on the channel list
    await waitFor(element(by.id("channel-list")))
      .toBeVisible()
      .withTimeout(5000);

    // Simulate a push notification arriving while app is in foreground
    await device.sendUserNotification({
      trigger: { type: "push" },
      title: "#notif-test",
      body: "Hello from push!",
      payload: {
        workspaceSlug: workspace.slug,
        channelId: extraChannel.id,
      },
    });

    // The notification response listener should navigate to the channel.
    // Detox's sendUserNotification simulates a tap, not just delivery.
    // Wait for the channel screen to appear.
    try {
      await waitFor(element(by.id("message-input")))
        .toBeVisible()
        .withTimeout(10000);

      // Verify we're in the right channel by checking the header
      await expect(element(by.text("notif-test"))).toBeVisible();
      await screenshot("notif-channel-deeplink");
    } catch {
      await screenshot("notif-channel-deeplink-failed");
      throw new Error(
        "Notification tap did not navigate to channel. " +
          "This may mean Detox sendUserNotification does not trigger " +
          "expo-notifications response listeners. Check screenshot.",
      );
    }
  });

  it("foreground notification tap navigates to thread", async () => {
    // Navigate back to channel list first
    try {
      for (let i = 0; i < 3; i++) {
        await waitFor(element(by.id("channel-list")))
          .toBeVisible()
          .withTimeout(1000);
        break;
      }
    } catch {
      // Try back navigation
      for (let i = 0; i < 3; i++) {
        try {
          await element(by.text("Back")).atIndex(0).tap();
        } catch {
          break;
        }
      }
    }

    await device.sendUserNotification({
      trigger: { type: "push" },
      title: "#general",
      subtitle: "Mobile E2E User",
      body: "Thread reply notification",
      payload: {
        workspaceSlug: workspace.slug,
        channelId: generalChannelId,
        parentMessageId: parentMessage.id,
      },
    });

    try {
      await waitFor(element(by.id("thread-message-list")))
        .toBeVisible()
        .withTimeout(10000);
      await screenshot("notif-thread-deeplink");
    } catch {
      await screenshot("notif-thread-deeplink-failed");
      throw new Error(
        "Notification tap did not navigate to thread. Check screenshot.",
      );
    }
  });

  it("cold launch from notification navigates to channel", async () => {
    // Terminate the app and relaunch with a notification payload
    await device.terminateApp();
    await device.launchApp({
      newInstance: true,
      launchArgs: {
        detoxTestToken: token,
        detoxTestUserId: defaultUser.id,
        detoxWorkspaceSlug: workspace.slug,
        detoxEnableSynchronization: 0,
      },
      userNotification: {
        trigger: { type: "push" },
        title: "#notif-test",
        body: "Cold launch notification",
        payload: {
          workspaceSlug: workspace.slug,
          channelId: extraChannel.id,
        },
      },
    });

    await device.setURLBlacklist([".*socket\\.io.*"]);
    await device.enableSynchronization();

    try {
      // App should bootstrap and then navigate to the channel from the notification
      await waitFor(element(by.id("message-input")))
        .toBeVisible()
        .withTimeout(30000);

      await expect(element(by.text("notif-test"))).toBeVisible();
      await screenshot("notif-cold-launch-channel");
    } catch {
      await screenshot("notif-cold-launch-channel-failed");
      throw new Error(
        "Cold launch from notification did not navigate to channel. " +
          "Check screenshot. expo-notifications may need additional " +
          "setup to handle initial notifications from Detox.",
      );
    }
  });
});
