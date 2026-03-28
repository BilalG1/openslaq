import { randomUUID } from "node:crypto";
import type { EphemeralMessage } from "@openslaq/shared";
import { asChannelId, asUserId } from "@openslaq/shared";
import {
  createSubscription,
  deleteSubscription,
  listSubscriptionsForChannel,
  getGithubBotForWorkspace,
} from "./service";
import { handleGithubEvent } from "./event-handlers";
import { getTestPayload, TEST_EVENT_NAMES } from "./test-mode";
import { createMessage } from "../../messages/service";
import { setMessageActions } from "../../bots/service";
import { addChannelMember, isChannelMember } from "../../channels/service";
import { emitToChannel } from "../../lib/emit";

function makeEphemeral(channelId: string, text: string): EphemeralMessage {
  return {
    id: randomUUID(),
    channelId: asChannelId(channelId),
    text,
    senderName: "GitHub",
    senderAvatarUrl: "https://github.githubassets.com/favicons/favicon.svg",
    createdAt: new Date().toISOString(),
    ephemeral: true,
  };
}

const VALID_EVENTS = ["pulls", "reviews", "review_requests", "checks"];

export async function handleGithub(
  args: string,
  userId: string,
  channelId: string,
  workspaceId: string,
): Promise<EphemeralMessage[]> {
  const parts = args.trim().split(/\s+/);
  const subcommand = parts[0]?.toLowerCase();

  if (!subcommand) {
    return [makeEphemeral(channelId, usage())];
  }

  switch (subcommand) {
    case "subscribe":
      return handleSubscribe(parts.slice(1), userId, workspaceId, channelId);
    case "unsubscribe":
      return handleUnsubscribe(parts.slice(1), workspaceId, channelId);
    case "list":
      return handleList(workspaceId, channelId);
    case "test":
      return handleTest(parts.slice(1), workspaceId, channelId);
    default:
      return [makeEphemeral(channelId, usage())];
  }
}

async function handleSubscribe(
  args: string[],
  userId: string,
  workspaceId: string,
  channelId: string,
): Promise<EphemeralMessage[]> {
  const repoFullName = args[0];
  if (!repoFullName || !repoFullName.includes("/")) {
    return [makeEphemeral(channelId, "Usage: `/github subscribe owner/repo [events]`\nExample: `/github subscribe acme/widget pulls,reviews`")];
  }

  // Parse optional event filter
  let enabledEvents: string[] | undefined;
  if (args[1]) {
    enabledEvents = args[1].split(",").map((e) => e.trim().toLowerCase());
    const invalid = enabledEvents.filter((e) => !VALID_EVENTS.includes(e));
    if (invalid.length > 0) {
      return [makeEphemeral(channelId, `Unknown events: ${invalid.join(", ")}. Valid: ${VALID_EVENTS.join(", ")}`)];
    }
  }

  // Check bot is installed
  const bot = await getGithubBotForWorkspace(workspaceId);
  if (!bot) {
    return [makeEphemeral(channelId, "GitHub bot is not installed. Install it from the Marketplace first.")];
  }

  // Check for existing subscription
  const existing = await listSubscriptionsForChannel(workspaceId, channelId);
  if (existing.some((s) => s.repoFullName === repoFullName.toLowerCase())) {
    return [makeEphemeral(channelId, `Already subscribed to **${repoFullName}** in this channel.`)];
  }

  await createSubscription(workspaceId, channelId, repoFullName, enabledEvents, userId);

  // Ensure bot user is in the channel
  const botInChannel = await isChannelMember(asChannelId(channelId), asUserId(bot.userId));
  if (!botInChannel) {
    await addChannelMember(asChannelId(channelId), asUserId(bot.userId));
  }

  const events = enabledEvents ?? ["pulls", "reviews", "checks"];
  return [makeEphemeral(channelId, `Subscribed to **${repoFullName}** (events: ${events.join(", ")})`)];
}

async function handleUnsubscribe(
  args: string[],
  workspaceId: string,
  channelId: string,
): Promise<EphemeralMessage[]> {
  const repoFullName = args[0];
  if (!repoFullName || !repoFullName.includes("/")) {
    return [makeEphemeral(channelId, "Usage: `/github unsubscribe owner/repo`")];
  }

  const removed = await deleteSubscription(workspaceId, channelId, repoFullName);
  if (!removed) {
    return [makeEphemeral(channelId, `No subscription for **${repoFullName}** in this channel.`)];
  }

  return [makeEphemeral(channelId, `Unsubscribed from **${repoFullName}**.`)];
}

async function handleList(
  workspaceId: string,
  channelId: string,
): Promise<EphemeralMessage[]> {
  const subs = await listSubscriptionsForChannel(workspaceId, channelId);
  if (subs.length === 0) {
    return [makeEphemeral(channelId, "No GitHub subscriptions in this channel.\nUse `/github subscribe owner/repo` to add one.")];
  }

  const lines = subs.map(
    (s) => `\u2022 **${s.repoFullName}** (${s.enabledEvents.join(", ")})`,
  );
  return [makeEphemeral(channelId, `GitHub subscriptions:\n${lines.join("\n")}`)];
}

async function handleTest(
  args: string[],
  workspaceId: string,
  channelId: string,
): Promise<EphemeralMessage[]> {
  const eventName = args[0];
  if (!eventName) {
    return [makeEphemeral(channelId, `Usage: \`/github test <event>\`\nAvailable: ${TEST_EVENT_NAMES.join(", ")}`)];
  }

  const testData = getTestPayload(eventName);
  if (!testData) {
    return [makeEphemeral(channelId, `Unknown test event: ${eventName}\nAvailable: ${TEST_EVENT_NAMES.join(", ")}`)];
  }

  const bot = await getGithubBotForWorkspace(workspaceId);
  if (!bot) {
    return [makeEphemeral(channelId, "GitHub bot is not installed. Install it from the Marketplace first.")];
  }

  // Use any valid events for test mode
  const allEvents = ["pulls", "reviews", "review_requests", "checks"];
  const formatted = handleGithubEvent(testData.eventType, testData.payload, allEvents);
  if (!formatted) {
    return [makeEphemeral(channelId, `Event "${eventName}" didn't produce a message.`)];
  }

  // Post as real message from bot
  const result = await createMessage(
    asChannelId(channelId),
    asUserId(bot.userId),
    formatted.content,
  );

  if ("error" in result) {
    return [makeEphemeral(channelId, `Failed to post test message: ${result.error}`)];
  }

  // Add action buttons
  if (formatted.actions.length > 0) {
    await setMessageActions(result.id, bot.botAppId, formatted.actions.map((a) => ({
      id: crypto.randomUUID(),
      type: "button" as const,
      label: a.label,
      value: a.url,
      style: a.style ?? "default",
    })));
  }

  // Emit Socket.IO event
  try {
    emitToChannel(asChannelId(channelId), "message:new", result);
  } catch {
    // Socket.IO may not be initialized in test contexts
  }

  return [makeEphemeral(channelId, `Test event "${eventName}" posted.`)];
}

function usage(): string {
  return [
    "**GitHub Bot Commands:**",
    "\u2022 `/github subscribe owner/repo [events]` \u2014 Subscribe channel to repo",
    "\u2022 `/github unsubscribe owner/repo` \u2014 Remove subscription",
    "\u2022 `/github list` \u2014 List subscriptions in this channel",
    "\u2022 `/github test <event>` \u2014 Simulate a GitHub event",
    "",
    `Valid events: ${VALID_EVENTS.join(", ")}`,
    `Test events: ${TEST_EVENT_NAMES.join(", ")}`,
  ].join("\n");
}
