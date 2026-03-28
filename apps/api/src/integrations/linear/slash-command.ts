import { randomUUID } from "node:crypto";
import type { EphemeralMessage } from "@openslaq/shared";
import { asChannelId, asUserId } from "@openslaq/shared";
import {
  createSubscription,
  deleteSubscription,
  listSubscriptionsForChannel,
  getLinearBotForWorkspace,
  getConnectionForWorkspace,
} from "./service";
import { getTeamByKey } from "./linear-api";
import { handleLinearEvent } from "./event-handlers";
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
    senderName: "Linear",
    senderAvatarUrl: "https://linear.app/favicon.ico",
    createdAt: new Date().toISOString(),
    ephemeral: true,
  };
}

const VALID_EVENTS = ["issues", "comments", "projects", "cycles"];

export async function handleLinear(
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
  const teamKey = args[0]?.toUpperCase();
  if (!teamKey) {
    return [makeEphemeral(channelId, "Usage: `/linear subscribe TEAM-KEY [events]`\nExample: `/linear subscribe BAC issues,comments`")];
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
  const bot = await getLinearBotForWorkspace(workspaceId);
  if (!bot) {
    return [makeEphemeral(channelId, "Linear bot is not installed. Install it from the Marketplace first.")];
  }

  // Check for existing subscription
  const existing = await listSubscriptionsForChannel(workspaceId, channelId);
  if (existing.some((s) => s.teamKey === teamKey)) {
    return [makeEphemeral(channelId, `Already subscribed to **${teamKey}** in this channel.`)];
  }

  // Resolve team key to team ID via Linear API (if connection exists)
  let teamId = teamKey; // fallback: use key as ID for test mode
  const connection = await getConnectionForWorkspace(workspaceId);
  if (connection) {
    const team = await getTeamByKey(connection.accessToken, teamKey);
    if (!team) {
      return [makeEphemeral(channelId, `Team **${teamKey}** not found in your Linear organization.`)];
    }
    teamId = team.id;
  }

  await createSubscription(workspaceId, channelId, teamKey, teamId, enabledEvents, userId);

  // Ensure bot user is in the channel
  const botInChannel = await isChannelMember(asChannelId(channelId), asUserId(bot.userId));
  if (!botInChannel) {
    await addChannelMember(asChannelId(channelId), asUserId(bot.userId));
  }

  const events = enabledEvents ?? VALID_EVENTS;
  return [makeEphemeral(channelId, `Subscribed to **${teamKey}** (events: ${events.join(", ")})`)];
}

async function handleUnsubscribe(
  args: string[],
  workspaceId: string,
  channelId: string,
): Promise<EphemeralMessage[]> {
  const teamKey = args[0]?.toUpperCase();
  if (!teamKey) {
    return [makeEphemeral(channelId, "Usage: `/linear unsubscribe TEAM-KEY`")];
  }

  const removed = await deleteSubscription(workspaceId, channelId, teamKey);
  if (!removed) {
    return [makeEphemeral(channelId, `No subscription for **${teamKey}** in this channel.`)];
  }

  return [makeEphemeral(channelId, `Unsubscribed from **${teamKey}**.`)];
}

async function handleList(
  workspaceId: string,
  channelId: string,
): Promise<EphemeralMessage[]> {
  const subs = await listSubscriptionsForChannel(workspaceId, channelId);
  if (subs.length === 0) {
    return [makeEphemeral(channelId, "No Linear subscriptions in this channel.\nUse `/linear subscribe TEAM-KEY` to add one.")];
  }

  const lines = subs.map(
    (s) => `\u2022 **${s.teamKey}** (${s.enabledEvents.join(", ")})`,
  );
  return [makeEphemeral(channelId, `Linear subscriptions:\n${lines.join("\n")}`)];
}

async function handleTest(
  args: string[],
  workspaceId: string,
  channelId: string,
): Promise<EphemeralMessage[]> {
  const eventName = args[0];
  if (!eventName) {
    return [makeEphemeral(channelId, `Usage: \`/linear test <event>\`\nAvailable: ${TEST_EVENT_NAMES.join(", ")}`)];
  }

  const testData = getTestPayload(eventName);
  if (!testData) {
    return [makeEphemeral(channelId, `Unknown test event: ${eventName}\nAvailable: ${TEST_EVENT_NAMES.join(", ")}`)];
  }

  const bot = await getLinearBotForWorkspace(workspaceId);
  if (!bot) {
    return [makeEphemeral(channelId, "Linear bot is not installed. Install it from the Marketplace first.")];
  }

  // Use all valid events for test mode
  const formatted = handleLinearEvent(testData.payload, VALID_EVENTS);
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
    "**Linear Bot Commands:**",
    "\u2022 `/linear subscribe TEAM-KEY [events]` \u2014 Subscribe channel to Linear team",
    "\u2022 `/linear unsubscribe TEAM-KEY` \u2014 Remove subscription",
    "\u2022 `/linear list` \u2014 List subscriptions in this channel",
    "\u2022 `/linear test <event>` \u2014 Simulate a Linear event",
    "",
    `Valid events: ${VALID_EVENTS.join(", ")}`,
    `Test events: ${TEST_EVENT_NAMES.join(", ")}`,
  ].join("\n");
}
