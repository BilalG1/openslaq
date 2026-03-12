import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { botSlashCommands } from "./slash-command-schema";
import { botApps } from "../bots/schema";
import { webhookDeliveries } from "../bots/schema";
import { validateWebhookUrl } from "../bots/validate-url";
import type { WebhookEventPayload, EphemeralMessage } from "@openslaq/shared";
import { asChannelId, asUserId, asBotAppId, asWorkspaceId } from "@openslaq/shared";
import { randomUUID } from "node:crypto";
import { createHmac } from "node:crypto";

export async function executeBotCommand(
  commandName: string,
  args: string,
  userId: string,
  workspaceId: string,
  channelId: string,
): Promise<EphemeralMessage[]> {
  // Look up the bot command
  const row = await db
    .select({
      botAppId: botSlashCommands.botAppId,
      webhookUrl: botApps.webhookUrl,
      botName: botApps.name,
      apiToken: botApps.apiToken,
    })
    .from(botSlashCommands)
    .innerJoin(botApps, eq(botSlashCommands.botAppId, botApps.id))
    .where(
      and(
        eq(botSlashCommands.name, commandName),
        eq(botSlashCommands.enabled, true),
        eq(botApps.workspaceId, workspaceId),
        eq(botApps.enabled, true),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!row) return [];

  const urlCheck = validateWebhookUrl(row.webhookUrl);
  if (!urlCheck.ok) {
    return [
      {
        id: randomUUID(),
        channelId: asChannelId(channelId),
        text: `Failed to execute command: webhook URL is invalid.`,
        senderName: row.botName,
        senderAvatarUrl: null,
        createdAt: new Date().toISOString(),
        ephemeral: true,
      },
    ];
  }

  const payload: WebhookEventPayload = {
    type: "slash_command",
    slashCommand: {
      command: commandName,
      args,
      channelId: asChannelId(channelId),
      userId: asUserId(userId),
      timestamp: new Date().toISOString(),
    },
    botAppId: asBotAppId(row.botAppId),
    workspaceId: asWorkspaceId(workspaceId),
  };

  const body = JSON.stringify(payload);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (row.apiToken) {
    const signature = createHmac("sha256", row.apiToken).update(body).digest("hex");
    headers["X-OpenSlaq-Signature"] = `sha256=${signature}`;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(row.webhookUrl, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // Log delivery
    await db.insert(webhookDeliveries).values({
      botAppId: row.botAppId,
      eventType: "slash_command",
      payload,
      statusCode: String(res.status),
      attempts: "1",
      lastAttemptAt: new Date(),
    }).catch(console.error);

    if (res.ok) {
      const responseBody = (await res.json().catch(() => null)) as { text?: string } | null;
      if (responseBody?.text) {
        return [
          {
            id: randomUUID(),
            channelId: asChannelId(channelId),
            text: responseBody.text,
            senderName: row.botName,
            senderAvatarUrl: null,
            createdAt: new Date().toISOString(),
            ephemeral: true,
          },
        ];
      }
    }
  } catch {
    // Log failed delivery
    await db.insert(webhookDeliveries).values({
      botAppId: row.botAppId,
      eventType: "slash_command",
      payload,
      statusCode: "error",
      attempts: "1",
      lastAttemptAt: new Date(),
    }).catch(console.error);
  }

  return [];
}
