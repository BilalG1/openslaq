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
import { cleanScreenshots, launchApp, screenshot } from "./helpers/setup";

/** Navigate back to the channel list from any screen. */
async function navigateToChannelList() {
  // Already on channel list?
  try {
    await waitFor(element(by.id("channel-list")))
      .toBeVisible()
      .withTimeout(1000);
    return;
  } catch {
    // Not on channel list
  }

  // Try dismissing create-channel modal if it's open
  try {
    await element(by.id("create-channel-backdrop")).tap();
    await waitFor(element(by.id("channel-list")))
      .toBeVisible()
      .withTimeout(2000);
    return;
  } catch {
    // Modal wasn't open or didn't help
  }

  // Try dismissing edit-topic modal if it's open
  try {
    await element(by.id("edit-topic-backdrop")).tap();
  } catch {
    // Modal wasn't open
  }

  // Try dismissing search screen if it's open
  try {
    await element(by.id("search-back-button")).tap();
    await waitFor(element(by.id("channel-list")))
      .toBeVisible()
      .withTimeout(2000);
    return;
  } catch {
    // Search wasn't open
  }

  // Try dismissing any native Alert (Cancel button)
  try {
    await element(by.text("Cancel")).tap();
  } catch {
    // No alert open
  }

  // Try tapping the "Back" button up to 3 times to pop through stack screens
  // (channel-members → channelId → index, or browse → index, etc.)
  for (let i = 0; i < 3; i++) {
    try {
      await waitFor(element(by.id("channel-list")))
        .toBeVisible()
        .withTimeout(500);
      return;
    } catch {
      // Not yet on channel list
    }
    try {
      await element(by.text("Back")).atIndex(0).tap();
    } catch {
      break; // No back button available, stop trying
    }
  }

  await waitFor(element(by.id("channel-list")))
    .toBeVisible()
    .withTimeout(3000);
}

describe("Smoke", () => {
  let token: string;
  let workspace: { id: string; name: string; slug: string };
  let generalChannelId: string;
  let searchableContent: string;
  let parentMessage: { id: string; content: string };

  beforeAll(async () => {
    cleanScreenshots();

    // 1. Create auth credentials and workspace via API
    token = await signTestJwt();
    workspace = await createTestWorkspace(token);

    // 2. Create all test channels BEFORE launching the app so they appear in bootstrap
    await createTestChannel(token, workspace.slug, "design", "public");
    await createTestChannel(
      token,
      workspace.slug,
      "topic-channel",
      "public",
      "This is the channel topic",
    );
    await createTestChannel(token, workspace.slug, "leave-me", "public");

    // 3. Get #general for messaging/thread tests
    const channels = await getWorkspaceChannels(token, workspace.slug);
    const general = channels.find((c) => c.name === "general");
    if (!general) throw new Error("No #general channel found");
    generalChannelId = general.id;

    // 4. Create thread parent + reply
    parentMessage = await sendTestMessage(
      token,
      workspace.slug,
      generalChannelId,
      `Thread parent ${Date.now()}`,
    );
    await sendTestReply(
      token,
      workspace.slug,
      generalChannelId,
      parentMessage.id,
      `Thread reply ${Date.now()}`,
    );

    // 5. Create searchable message
    searchableContent = `SearchableMsg ${Date.now()}`;
    await sendTestMessage(
      token,
      workspace.slug,
      generalChannelId,
      searchableContent,
    );

    // 6. Launch app — all channels and messages already exist so bootstrap loads them
    await launchApp(token, defaultUser.id, workspace.slug);
  });

  afterAll(async () => {
    if (workspace) {
      await deleteTestWorkspace(token, workspace.slug);
    }
  });

  // Ensure synchronization is always re-enabled even if a test fails
  // while sync is disabled (prevents cascading failures).
  afterEach(async () => {
    await device.enableSynchronization();
  });

  describe("Channels", () => {
    it("creates a new channel via + button", async () => {
      await navigateToChannelList();

      await element(by.id("add-channel-link")).tap();

      await waitFor(element(by.id("create-channel-modal")))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id("create-channel-name-input")).typeText(
        "my-new-channel",
      );
      await element(by.id("create-channel-name-input")).tapReturnKey();
      await element(by.id("create-channel-submit")).tap();

      await waitFor(element(by.id("message-list")))
        .toBeVisible()
        .withTimeout(3000);

      await navigateToChannelList();
      await waitFor(element(by.text("my-new-channel")))
        .toBeVisible()
        .withTimeout(3000);
      await screenshot("channel-list-after-create");
    });

    it("creates a private channel", async () => {
      await navigateToChannelList();

      await element(by.id("add-channel-link")).tap();

      await waitFor(element(by.id("create-channel-modal")))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id("create-channel-name-input")).typeText(
        "secret-channel",
      );
      await element(by.id("create-channel-name-input")).tapReturnKey();
      await element(by.id("create-channel-type-private")).tap();
      await element(by.id("create-channel-submit")).tap();

      await waitFor(element(by.id("message-list")))
        .toBeVisible()
        .withTimeout(3000);

      await navigateToChannelList();
      await waitFor(element(by.text("secret-channel")))
        .toBeVisible()
        .withTimeout(3000);
    });

    it("creates a channel with description and shows banner", async () => {
      await navigateToChannelList();

      await element(by.id("add-channel-link")).tap();

      await waitFor(element(by.id("create-channel-modal")))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id("create-channel-name-input")).typeText(
        "desc-channel",
      );
      await element(by.id("create-channel-name-input")).tapReturnKey();
      await element(by.id("create-channel-description-input")).typeText(
        "Channel description text",
      );

      // Dismiss keyboard before submit — multiline field's tapReturnKey
      // inserts a newline, so tap the non-interactive title to blur instead.
      // This prevents the keyboard dismiss animation from competing with the
      // modal close + navigation on the native main queue (which caused flaky 30s timeouts).
      await element(by.text("Create Channel")).atIndex(0).tap();

      await waitFor(element(by.id("create-channel-submit")))
        .toBeVisible()
        .withTimeout(3000);

      // Disable sync before submit: socket timers from previously created
      // channels can keep the JS thread busy, blocking Detox's idle-wait
      // for the tap and subsequent navigation.
      await device.disableSynchronization();

      await element(by.id("create-channel-submit")).tap();

      await waitFor(element(by.id("message-list")))
        .toBeVisible()
        .withTimeout(30000);

      await expect(element(by.id("channel-description-banner"))).toBeVisible();
      await expect(element(by.id("channel-description-text"))).toBeVisible();
      await screenshot("channel-with-description-banner");
    });

    it("edits channel topic via options menu", async () => {
      // Navigate to the API-created topic-channel
      await navigateToChannelList();
      await element(by.text("topic-channel")).tap();

      await waitFor(element(by.id("channel-options-button")))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id("channel-options-button")).tap();
      await element(by.text("Edit Topic")).tap();

      await waitFor(element(by.id("edit-topic-modal")))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id("edit-topic-input")).clearText();
      await element(by.id("edit-topic-input")).typeText("Updated topic text");
      // Wait for KAV to position save button above keyboard
      await waitFor(element(by.id("edit-topic-save")))
        .toBeVisible()
        .withTimeout(3000);
      await element(by.id("edit-topic-save")).tap();

      await waitFor(element(by.text("Updated topic text")))
        .toBeVisible()
        .withTimeout(3000);
      await screenshot("channel-topic-updated");
    });

    it("leaves a channel", async () => {
      await navigateToChannelList();

      await waitFor(element(by.text("leave-me")))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.text("leave-me")).tap();

      await waitFor(element(by.id("message-list")))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id("channel-options-button")).tap();
      await element(by.text("Leave Channel")).tap();
      await waitFor(element(by.text("Are you sure you want to leave this channel?")))
        .toBeVisible()
        .withTimeout(3000);
      await element(by.text("Leave")).tap();

      await waitFor(element(by.id("channel-list")))
        .toBeVisible()
        .withTimeout(3000);

      await expect(element(by.text("leave-me"))).not.toBeVisible();
    });

    it("views channel members", async () => {
      await navigateToChannelList();

      await element(by.text("general")).tap();

      await waitFor(element(by.id("channel-options-button")))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id("channel-options-button")).tap();
      await element(by.text("View Members")).tap();

      await waitFor(element(by.id("members-list")))
        .toBeVisible()
        .withTimeout(3000);
      await screenshot("channel-members");
    });

    it("opens create channel modal from inline + Add channel link", async () => {
      await navigateToChannelList();

      await waitFor(element(by.id("add-channel-link")))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id("add-channel-link")).tap();

      await waitFor(element(by.id("create-channel-modal")))
        .toBeVisible()
        .withTimeout(3000);

      // Dismiss the modal
      await element(by.id("create-channel-backdrop")).tap();

      await waitFor(element(by.id("channel-list")))
        .toBeVisible()
        .withTimeout(3000);
    });
  });

  describe("Messaging", () => {
    it("displays channel list with #general", async () => {
      await navigateToChannelList();

      await waitFor(element(by.text("general")))
        .toBeVisible()
        .withTimeout(3000);
      await screenshot("channel-list");
    });

    it("navigates to channel and sees message input", async () => {
      await navigateToChannelList();
      await element(by.text("general")).tap();

      await waitFor(element(by.id("message-input")))
        .toBeVisible()
        .withTimeout(3000);
      await waitFor(element(by.id("message-send")))
        .toBeVisible()
        .withTimeout(3000);
      await screenshot("channel-with-messages");
    });

    it("sends message and sees it appear", async () => {
      await navigateToChannelList();
      await element(by.text("general")).tap();

      await waitFor(element(by.id("message-input")))
        .toBeVisible()
        .withTimeout(3000);

      const testMessage = `E2E smoke ${Date.now()}`;

      await element(by.id("message-input")).typeText(testMessage);
      await element(by.id("message-list")).tap();
      await element(by.id("message-send")).tap();

      await waitFor(element(by.text(testMessage)))
        .toBeVisible()
        .withTimeout(3000);
      await screenshot("message-sent");
    });

    it("edits a message via long press", async () => {
      await navigateToChannelList();
      await element(by.text("general")).tap();

      await waitFor(element(by.id("message-list")))
        .toBeVisible()
        .withTimeout(3000);

      const original = `Edit me ${Date.now()}`;
      const updated = `Edited ${Date.now()}`;
      const msg = await sendTestMessage(
        token,
        workspace.slug,
        generalChannelId,
        original,
      );

      await waitFor(element(by.text(original)))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id(`message-bubble-${msg.id}`)).longPress();

      await waitFor(element(by.id("action-edit-message")))
        .toBeVisible()
        .withTimeout(3000);
      await screenshot("message-long-press-actions");
      await element(by.id("action-edit-message")).tap();

      await waitFor(element(by.id("edit-banner")))
        .toBeVisible()
        .withTimeout(3000);
      await screenshot("message-edit-mode");

      await element(by.id("message-input")).clearText();
      await element(by.id("message-input")).typeText(updated);
      await element(by.id("message-list")).tap();
      await element(by.id("message-send")).tap();

      await waitFor(element(by.text(updated)))
        .toBeVisible()
        .withTimeout(3000);
      await waitFor(element(by.id(`message-edited-${msg.id}`)))
        .toBeVisible()
        .withTimeout(3000);
      await screenshot("message-edited");
    });

    it("deletes a message via long press", async () => {
      await navigateToChannelList();
      await element(by.text("general")).tap();

      await waitFor(element(by.id("message-list")))
        .toBeVisible()
        .withTimeout(3000);

      const content = `Delete me ${Date.now()}`;
      const msg = await sendTestMessage(
        token,
        workspace.slug,
        generalChannelId,
        content,
      );

      await waitFor(element(by.text(content)))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id(`message-bubble-${msg.id}`)).longPress();

      await waitFor(element(by.id("action-delete-message")))
        .toBeVisible()
        .withTimeout(3000);
      await element(by.id("action-delete-message")).tap();

      await waitFor(element(by.text("Delete")))
        .toBeVisible()
        .withTimeout(3000);
      await element(by.text("Delete")).tap();

      await waitFor(element(by.text(content)))
        .not.toBeVisible()
        .withTimeout(3000);
    });
  });

  describe("Threads", () => {
    it("opens thread and sends reply", async () => {
      await navigateToChannelList();
      await element(by.text("general")).tap();

      await waitFor(element(by.id(`reply-count-${parentMessage.id}`)))
        .toBeVisible()
        .withTimeout(3000);
      await element(by.id(`reply-count-${parentMessage.id}`)).tap();

      await waitFor(element(by.id("thread-message-list")))
        .toBeVisible()
        .withTimeout(3000);
      await expect(element(by.text(parentMessage.content))).toBeVisible();
      await screenshot("thread-view");

      const newReply = `Smoke reply ${Date.now()}`;
      await element(by.id("message-input")).typeText(newReply);
      await element(by.id("thread-message-list")).tap();
      await element(by.id("message-send")).tap();

      await waitFor(element(by.text(newReply)))
        .toBeVisible()
        .withTimeout(3000);
    });
  });

  describe("Search", () => {
    it("searches for a message and sees results", async () => {
      await navigateToChannelList();

      await device.disableSynchronization();
      await element(by.id("search-pill")).tap();

      await waitFor(element(by.id("search-input")))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id("search-input")).typeText(searchableContent);
      await element(by.id("search-input")).tapReturnKey();

      await waitFor(element(by.text(searchableContent)))
        .toBeVisible()
        .withTimeout(8000);
      await screenshot("search-results");

      await device.enableSynchronization();
    });
  });

  // Profile & sign-out tests run last — sign-out ends the authenticated session
  describe("Profile & Settings", () => {
    it("opens settings, verifies profile, edits name, and signs out", async () => {
      await navigateToChannelList();

      await element(by.id("header-avatar-button")).tap();

      await waitFor(element(by.id("settings-screen")))
        .toBeVisible()
        .withTimeout(3000);

      await waitFor(element(by.id("settings-display-name-input")))
        .toBeVisible()
        .withTimeout(3000);
      await expect(element(by.id("settings-email"))).toBeVisible();
      await expect(element(by.id("settings-sign-out"))).toBeVisible();
      await screenshot("settings-screen");

      await element(by.id("settings-display-name-input")).tap();
      await element(by.id("settings-display-name-input")).clearText();
      await element(by.id("settings-display-name-input")).typeText(
        "Updated Name",
      );
      await element(by.id("settings-display-name-input")).tapReturnKey();

      await waitFor(element(by.id("settings-save-name")))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id("settings-save-name")).tap();

      // Scroll to ensure sign-out button is fully visible
      await element(by.id("settings-screen")).scrollTo("bottom");

      await waitFor(element(by.id("settings-sign-out")))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id("settings-sign-out")).tap();

      // Wait for the confirmation alert to appear
      await waitFor(element(by.text("Are you sure you want to sign out?")))
        .toBeVisible()
        .withTimeout(3000);

      // Tap the destructive "Sign Out" button in the native UIAlertController.
      // Two button-trait elements match label "Sign Out": the settings screen
      // Pressable (index 0) and the alert action button (index 1).
      await element(by.label("Sign Out").and(by.traits(["button"]))).atIndex(1).tap();

      // Disable synchronization: the navigation transition after sign-out
      // keeps the main run loop busy, blocking Detox's idle-wait forever.
      await device.disableSynchronization();

      await waitFor(element(by.id("sign-in-screen")))
        .toBeVisible()
        .withTimeout(10000);
      await screenshot("sign-in-screen");

      await device.enableSynchronization();
    });
  });
});
