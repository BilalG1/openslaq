import { eq, and, inArray } from "drizzle-orm";
import { db } from "../db";
import { botApps, botEventSubscriptions, webhookDeliveries } from "./schema";
import { channelMembers, channels } from "../channels/schema";
import type { BotScope, WebhookEventPayload, WebhookEventType, BotEventDataMap } from "@openslaq/shared";
import { asChannelId, asBotAppId, asWorkspaceId } from "@openslaq/shared";
import { validateWebhookUrl } from "./validate-url";
import { createHmac } from "node:crypto";

// In test mode, use near-instant retry delays instead of seconds-long backoff
const RETRY_BASE_MS = process.env.E2E_TEST_SECRET ? 10 : 1000;

const SCOPE_REQUIREMENTS: Record<WebhookEventType, BotScope> = {
  "message:new": "chat:read",
  "message:updated": "chat:read",
  "message:deleted": "chat:read",
  "reaction:updated": "reactions:read",
  "channel:updated": "channels:read",
  "channel:member-added": "channels:members:read",
  "channel:member-removed": "channels:members:read",
  "message:pinned": "chat:read",
  "message:unpinned": "chat:read",
  "presence:updated": "presence:read",
};

interface DispatchEvent<T extends WebhookEventType = WebhookEventType> {
  type: T;
  channelId?: string;
  workspaceId: string;
  data: BotEventDataMap[T];
  excludeBotUserId?: string; // Don't notify the bot that sent the event
}

class WebhookDispatcher {
  /** Convenience: dispatch using just channelId (looks up workspaceId from channel) */
  async dispatchForChannel<T extends WebhookEventType>(event: Omit<DispatchEvent<T>, "workspaceId"> & { channelId: string }): Promise<void> {
    try {
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, event.channelId),
      });
      if (!channel) return;
      await this.dispatch({ ...event, workspaceId: channel.workspaceId });
    } catch (err) {
      console.error("Webhook dispatchForChannel error:", err);
    }
  }

  async dispatch<T extends WebhookEventType>(event: DispatchEvent<T>): Promise<void> {
    try {
      // Find bots subscribed to this event type in this workspace
      const subs = await db
        .select({
          botAppId: botEventSubscriptions.botAppId,
        })
        .from(botEventSubscriptions)
        .innerJoin(botApps, eq(botEventSubscriptions.botAppId, botApps.id))
        .where(
          and(
            eq(botEventSubscriptions.eventType, event.type),
            eq(botApps.workspaceId, event.workspaceId),
            eq(botApps.enabled, true),
          ),
        );

      if (subs.length === 0) return;

      const botIds = [...new Set(subs.map((s) => s.botAppId))];

      // Fetch full bot details
      const bots = await db.query.botApps.findMany({
        where: inArray(botApps.id, botIds),
      });

      // First pass: filter by excludeBotUserId and scope
      const requiredScope = SCOPE_REQUIREMENTS[event.type];
      const eligibleBots = bots.filter((bot) => {
        if (event.excludeBotUserId && bot.userId === event.excludeBotUserId) return false;
        if (requiredScope && !(bot.scopes as BotScope[]).includes(requiredScope)) return false;
        return true;
      });

      // Batch channel membership check
      let memberUserIds: Set<string> | null = null;
      if (event.channelId && eligibleBots.length > 0) {
        const botUserIds = eligibleBots.map((b) => b.userId);
        const memberRows = await db
          .select({ userId: channelMembers.userId })
          .from(channelMembers)
          .where(
            and(
              eq(channelMembers.channelId, event.channelId),
              inArray(channelMembers.userId, botUserIds),
            ),
          );
        memberUserIds = new Set(memberRows.map((r) => r.userId));
      }

      for (const bot of eligibleBots) {
        // Check channel membership using batched result
        if (event.channelId && memberUserIds && !memberUserIds.has(bot.userId)) continue;

        const payload: WebhookEventPayload = {
          type: "event",
          event: {
            type: event.type,
            data: event.data,
            channelId: event.channelId !== undefined ? asChannelId(event.channelId) : undefined,
            timestamp: new Date().toISOString(),
          },
          botAppId: asBotAppId(bot.id),
          workspaceId: asWorkspaceId(event.workspaceId),
        };

        // Validate URL before fetching
        const urlCheck = validateWebhookUrl(bot.webhookUrl);
        if (!urlCheck.ok) {
          console.warn(`Skipping webhook for bot ${bot.id}: ${urlCheck.reason}`);
          continue;
        }

        // Fire and forget — don't block the request
        void this.deliverWebhook(bot.id, bot.webhookUrl, payload, event.type, bot.apiToken);
      }
    } catch (err) {
      console.error("Webhook dispatch error:", err);
    }
  }

  private async deliverWebhook(
    botAppId: string,
    webhookUrl: string,
    payload: WebhookEventPayload,
    eventType: string,
    webhookSecret?: string | null,
  ): Promise<void> {
    const maxAttempts = 3;
    let lastStatusCode: string | null = null;
    const body = JSON.stringify(payload);

    // Compute HMAC signature if a webhook secret is configured
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (webhookSecret) {
      const signature = createHmac("sha256", webhookSecret).update(body).digest("hex");
      headers["X-OpenSlaq-Signature"] = `sha256=${signature}`;
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(webhookUrl, {
          method: "POST",
          headers,
          body,
          signal: controller.signal,
        });

        clearTimeout(timeout);
        lastStatusCode = String(res.status);

        if (res.ok) {
          // Log successful delivery
          await this.logDelivery(botAppId, eventType, payload, lastStatusCode, attempt);
          return;
        }
      } catch {
        lastStatusCode = "error";
      }

      // Exponential backoff before retry
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_BASE_MS * 2 ** (attempt - 1)));
      }
    }

    // Log failed delivery after all attempts
    await this.logDelivery(botAppId, eventType, payload, lastStatusCode, maxAttempts);
  }

  private async logDelivery(
    botAppId: string,
    eventType: string,
    payload: WebhookEventPayload,
    statusCode: string | null,
    attempts: number,
  ): Promise<void> {
    try {
      await db.insert(webhookDeliveries).values({
        botAppId,
        eventType,
        payload,
        statusCode,
        attempts: String(attempts),
        lastAttemptAt: new Date(),
      });
    } catch (err) {
      console.error("Failed to log webhook delivery:", err);
    }
  }
}

export const webhookDispatcher = new WebhookDispatcher();
