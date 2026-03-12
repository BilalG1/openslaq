import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { botApps, botEventSubscriptions, messageActions } from "./schema";
import { users } from "../users/schema";
import { workspaceMembers } from "../workspaces/schema";
import { generateApiToken } from "./token";
import type { BotScope, BotEventType, BotApp, MessageActionButton } from "@openslaq/shared";
import { asBotAppId, asWorkspaceId, asUserId } from "@openslaq/shared";

export async function createBotApp(
  workspaceId: string,
  name: string,
  description: string | null,
  avatarUrl: string | null,
  webhookUrl: string,
  scopes: BotScope[],
  subscribedEvents: BotEventType[],
  createdBy: string,
  marketplaceListingId?: string | null,
): Promise<{ bot: BotApp; apiToken: string }> {
  const { token, hash, prefix } = generateApiToken();
  const botUserId = `bot:${crypto.randomUUID()}`;

  const bot = await db.transaction(async (tx) => {
    // Create user row for the bot
    await tx.insert(users).values({
      id: botUserId,
      displayName: name,
      email: `${botUserId}@bot.openslaq`,
      avatarUrl,
    });

    // Add bot as workspace member
    await tx.insert(workspaceMembers).values({
      workspaceId,
      userId: botUserId,
      role: "member",
    });

    // Create bot_apps row
    const [botRow] = await tx
      .insert(botApps)
      .values({
        workspaceId,
        userId: botUserId,
        name,
        description,
        avatarUrl,
        webhookUrl,
        apiToken: hash,
        apiTokenPrefix: prefix,
        scopes,
        marketplaceListingId: marketplaceListingId ?? null,
        createdBy,
      })
      .returning();

    if (!botRow) throw new Error("Failed to create bot app");

    // Create event subscriptions
    if (subscribedEvents.length > 0) {
      await tx.insert(botEventSubscriptions).values(
        subscribedEvents.map((eventType) => ({
          botAppId: botRow.id,
          eventType,
        })),
      );
    }

    return botRow;
  });

  return {
    bot: toBotApp(bot, subscribedEvents),
    apiToken: token,
  };
}

export async function updateBotApp(
  botAppId: string,
  workspaceId: string,
  updates: {
    name?: string;
    description?: string | null;
    avatarUrl?: string | null;
    webhookUrl?: string;
    scopes?: BotScope[];
    subscribedEvents?: BotEventType[];
  },
): Promise<BotApp | null> {
  const existing = await db.query.botApps.findFirst({
    where: and(eq(botApps.id, botAppId), eq(botApps.workspaceId, workspaceId)),
  });
  if (!existing) return null;

  await db.transaction(async (tx) => {
    const setFields: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.name !== undefined) setFields.name = updates.name;
    if (updates.description !== undefined) setFields.description = updates.description;
    if (updates.avatarUrl !== undefined) setFields.avatarUrl = updates.avatarUrl;
    if (updates.webhookUrl !== undefined) setFields.webhookUrl = updates.webhookUrl;
    if (updates.scopes !== undefined) setFields.scopes = updates.scopes;

    await tx.update(botApps).set(setFields).where(eq(botApps.id, botAppId));

    // Update user row too if name/avatar changed
    if (updates.name !== undefined || updates.avatarUrl !== undefined) {
      const userUpdates: Record<string, unknown> = { updatedAt: new Date() };
      if (updates.name !== undefined) userUpdates.displayName = updates.name;
      if (updates.avatarUrl !== undefined) userUpdates.avatarUrl = updates.avatarUrl;
      await tx.update(users).set(userUpdates).where(eq(users.id, existing.userId));
    }

    // Replace event subscriptions
    if (updates.subscribedEvents !== undefined) {
      await tx.delete(botEventSubscriptions).where(eq(botEventSubscriptions.botAppId, botAppId));
      if (updates.subscribedEvents.length > 0) {
        await tx.insert(botEventSubscriptions).values(
          updates.subscribedEvents.map((eventType) => ({
            botAppId,
            eventType,
          })),
        );
      }
    }
  });

  return getBotAppById(botAppId, workspaceId);
}

export async function deleteBotApp(botAppId: string, workspaceId: string): Promise<boolean> {
  const bot = await db.query.botApps.findFirst({
    where: and(eq(botApps.id, botAppId), eq(botApps.workspaceId, workspaceId)),
  });
  if (!bot) return false;

  await db.transaction(async (tx) => {
    // Delete bot_apps (cascades to subscriptions, message_actions, webhook_deliveries)
    await tx.delete(botApps).where(eq(botApps.id, botAppId));
    // Delete workspace membership
    await tx.delete(workspaceMembers).where(
      and(
        eq(workspaceMembers.userId, bot.userId),
        eq(workspaceMembers.workspaceId, bot.workspaceId),
      ),
    );
    // Delete user
    await tx.delete(users).where(eq(users.id, bot.userId));
  });

  return true;
}

export async function listBotApps(workspaceId: string): Promise<BotApp[]> {
  const bots = await db.query.botApps.findMany({
    where: eq(botApps.workspaceId, workspaceId),
  });

  // Batch fetch subscriptions for all bots
  const botIds = bots.map((b) => b.id);
  const subsByBot = new Map<string, string[]>();
  if (botIds.length > 0) {
    const { inArray } = await import("drizzle-orm");
    const subs = await db.query.botEventSubscriptions.findMany({
      where: inArray(botEventSubscriptions.botAppId, botIds),
    });
    for (const sub of subs) {
      const list = subsByBot.get(sub.botAppId) ?? [];
      list.push(sub.eventType);
      subsByBot.set(sub.botAppId, list);
    }
  }

  return bots.map((b) => toBotApp(b, (subsByBot.get(b.id) ?? []) as BotEventType[]));
}

export async function getBotAppById(botAppId: string, workspaceId: string): Promise<BotApp | null> {
  const bot = await db.query.botApps.findFirst({
    where: and(eq(botApps.id, botAppId), eq(botApps.workspaceId, workspaceId)),
  });
  if (!bot) return null;

  const subs = await db.query.botEventSubscriptions.findMany({
    where: eq(botEventSubscriptions.botAppId, botAppId),
  });

  return toBotApp(bot, subs.map((s) => s.eventType as BotEventType));
}

export async function regenerateToken(botAppId: string, workspaceId: string): Promise<{ apiToken: string; apiTokenPrefix: string } | null> {
  const bot = await db.query.botApps.findFirst({
    where: and(eq(botApps.id, botAppId), eq(botApps.workspaceId, workspaceId)),
  });
  if (!bot) return null;

  const { token, hash, prefix } = generateApiToken();
  await db
    .update(botApps)
    .set({ apiToken: hash, apiTokenPrefix: prefix, updatedAt: new Date() })
    .where(eq(botApps.id, botAppId));

  return { apiToken: token, apiTokenPrefix: prefix };
}

export async function toggleBotEnabled(botAppId: string, workspaceId: string, enabled: boolean): Promise<boolean> {
  const [updated] = await db
    .update(botApps)
    .set({ enabled, updatedAt: new Date() })
    .where(and(eq(botApps.id, botAppId), eq(botApps.workspaceId, workspaceId)))
    .returning();
  return !!updated;
}

export async function getMessageActionsForMessages(messageIds: string[]): Promise<Map<string, { botAppId: string; actions: MessageActionButton[] }>> {
  if (messageIds.length === 0) return new Map();
  const { inArray } = await import("drizzle-orm");
  const rows = await db.query.messageActions.findMany({
    where: inArray(messageActions.messageId, messageIds),
  });
  const map = new Map<string, { botAppId: string; actions: MessageActionButton[] }>();
  for (const row of rows) {
    map.set(row.messageId, { botAppId: row.botAppId, actions: row.actions as MessageActionButton[] });
  }
  return map;
}

export async function setMessageActions(messageId: string, botAppId: string, actions: MessageActionButton[]): Promise<void> {
  // Upsert: delete existing then insert
  await db.transaction(async (tx) => {
    await tx.delete(messageActions).where(eq(messageActions.messageId, messageId));
    if (actions.length > 0) {
      await tx.insert(messageActions).values({
        messageId,
        botAppId,
        actions,
      });
    }
  });
}

function toBotApp(
  b: typeof botApps.$inferSelect,
  subscribedEvents: BotEventType[],
): BotApp {
  return {
    id: asBotAppId(b.id),
    workspaceId: asWorkspaceId(b.workspaceId),
    userId: asUserId(b.userId),
    name: b.name,
    description: b.description,
    avatarUrl: b.avatarUrl,
    webhookUrl: b.webhookUrl,
    apiTokenPrefix: b.apiTokenPrefix,
    scopes: b.scopes as BotScope[],
    subscribedEvents,
    enabled: b.enabled,
    marketplaceListingId: b.marketplaceListingId,
    createdBy: asUserId(b.createdBy),
    createdAt: b.createdAt.toISOString(),
  };
}
