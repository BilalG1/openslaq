import { eq, and, lte, asc, count } from "drizzle-orm";
import { db } from "../db";
import { scheduledMessages } from "./scheduled-schema";
import { channels } from "../channels/schema";
import { channelMembers } from "../channels/schema";
import { createMessage } from "./service";
import { getIO } from "../socket/io";
import { unfurlMessageLinks } from "./link-preview-service";
import { webhookDispatcher } from "../bots/webhook-dispatcher";
import type { ScheduledMessage } from "@openslaq/shared";
import { asChannelId, asUserId, asMessageId } from "@openslaq/shared";

function toScheduledMessage(row: typeof scheduledMessages.$inferSelect): ScheduledMessage {
  return {
    id: row.id,
    channelId: asChannelId(row.channelId),
    userId: asUserId(row.userId),
    content: row.content,
    attachmentIds: (row.attachmentIds ?? []) as string[],
    scheduledFor: row.scheduledFor.toISOString(),
    status: row.status,
    failureReason: row.failureReason,
    sentMessageId: row.sentMessageId ? asMessageId(row.sentMessageId) : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createScheduledMessage(
  channelId: string,
  userId: string,
  content: string,
  scheduledFor: Date,
  attachmentIds: string[] = [],
): Promise<ScheduledMessage> {
  const [row] = await db
    .insert(scheduledMessages)
    .values({ channelId, userId, content, scheduledFor, attachmentIds })
    .returning();
  return toScheduledMessage(row!);
}

export async function getScheduledMessagesForUser(
  userId: string,
  workspaceId: string,
): Promise<Array<ScheduledMessage & { channelName: string }>> {
  const rows = await db
    .select({
      scheduled: scheduledMessages,
      channelName: channels.name,
    })
    .from(scheduledMessages)
    .innerJoin(channels, eq(scheduledMessages.channelId, channels.id))
    .where(
      and(
        eq(scheduledMessages.userId, userId),
        eq(channels.workspaceId, workspaceId),
      ),
    )
    .orderBy(asc(scheduledMessages.scheduledFor));

  return rows.map((r) => ({
    ...toScheduledMessage(r.scheduled),
    channelName: r.channelName,
  }));
}

export async function getScheduledCountForChannel(
  userId: string,
  channelId: string,
): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(scheduledMessages)
    .where(
      and(
        eq(scheduledMessages.channelId, channelId),
        eq(scheduledMessages.userId, userId),
        eq(scheduledMessages.status, "pending"),
      ),
    );
  return row?.count ?? 0;
}

export async function getScheduledMessageById(
  id: string,
  userId: string,
): Promise<ScheduledMessage | null> {
  const row = await db.query.scheduledMessages.findFirst({
    where: and(
      eq(scheduledMessages.id, id),
      eq(scheduledMessages.userId, userId),
    ),
  });
  if (!row) return null;
  return toScheduledMessage(row);
}

export async function updateScheduledMessage(
  id: string,
  userId: string,
  updates: { content?: string; scheduledFor?: Date; attachmentIds?: string[] },
): Promise<ScheduledMessage | null> {
  const existing = await db.query.scheduledMessages.findFirst({
    where: and(
      eq(scheduledMessages.id, id),
      eq(scheduledMessages.userId, userId),
      eq(scheduledMessages.status, "pending"),
    ),
  });
  if (!existing) return null;

  const [updated] = await db
    .update(scheduledMessages)
    .set({
      ...(updates.content !== undefined ? { content: updates.content } : {}),
      ...(updates.scheduledFor !== undefined ? { scheduledFor: updates.scheduledFor } : {}),
      ...(updates.attachmentIds !== undefined ? { attachmentIds: updates.attachmentIds } : {}),
      updatedAt: new Date(),
    })
    .where(eq(scheduledMessages.id, id))
    .returning();

  return updated ? toScheduledMessage(updated) : null;
}

export async function deleteScheduledMessage(
  id: string,
  userId: string,
): Promise<boolean> {
  const result = await db
    .delete(scheduledMessages)
    .where(
      and(
        eq(scheduledMessages.id, id),
        eq(scheduledMessages.userId, userId),
        eq(scheduledMessages.status, "pending"),
      ),
    )
    .returning();
  return result.length > 0;
}

// --- Scheduler ---

let isProcessing = false;

export async function processDueScheduledMessages(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const dueMessages = await db
      .select()
      .from(scheduledMessages)
      .where(
        and(
          eq(scheduledMessages.status, "pending"),
          lte(scheduledMessages.scheduledFor, new Date()),
        ),
      )
      .limit(20);

    const io = getIO();

    for (const scheduled of dueMessages) {
      try {
        // Check channel exists and not archived
        const channel = await db.query.channels.findFirst({
          where: eq(channels.id, scheduled.channelId),
        });

        if (!channel || channel.isArchived) {
          await db
            .update(scheduledMessages)
            .set({
              status: "failed",
              failureReason: channel ? "Channel is archived" : "Channel not found",
              updatedAt: new Date(),
            })
            .where(eq(scheduledMessages.id, scheduled.id));

          io.to(`user:${scheduled.userId}`).emit("scheduledMessage:failed", {
            id: scheduled.id,
            channelId: asChannelId(scheduled.channelId),
            failureReason: channel ? "Channel is archived" : "Channel not found",
          });
          continue;
        }

        // Check user is still a member
        const membership = await db.query.channelMembers.findFirst({
          where: and(
            eq(channelMembers.channelId, scheduled.channelId),
            eq(channelMembers.userId, scheduled.userId),
          ),
        });

        if (!membership) {
          await db
            .update(scheduledMessages)
            .set({
              status: "failed",
              failureReason: "User is no longer a channel member",
              updatedAt: new Date(),
            })
            .where(eq(scheduledMessages.id, scheduled.id));

          io.to(`user:${scheduled.userId}`).emit("scheduledMessage:failed", {
            id: scheduled.id,
            channelId: asChannelId(scheduled.channelId),
            failureReason: "User is no longer a channel member",
          });
          continue;
        }

        // Send the message
        const attachmentIds = (scheduled.attachmentIds ?? []) as string[];
        const message = await createMessage(
          asChannelId(scheduled.channelId),
          asUserId(scheduled.userId),
          scheduled.content,
          attachmentIds,
        );

        // Emit message:new to channel
        io.to(`channel:${scheduled.channelId}`).emit("message:new", message);
        webhookDispatcher.dispatch({
          type: "message:new",
          channelId: scheduled.channelId,
          workspaceId: channel.workspaceId,
          data: message,
        });
        unfurlMessageLinks(message.id, asChannelId(scheduled.channelId), scheduled.content).catch(console.error);

        // Mark as sent
        await db
          .update(scheduledMessages)
          .set({
            status: "sent",
            sentMessageId: message.id,
            updatedAt: new Date(),
          })
          .where(eq(scheduledMessages.id, scheduled.id));

        // Notify the user
        io.to(`user:${scheduled.userId}`).emit("scheduledMessage:sent", {
          id: scheduled.id,
          channelId: asChannelId(scheduled.channelId),
          messageId: asMessageId(message.id),
        });
      } catch (err) {
        console.error(`Failed to process scheduled message ${scheduled.id}:`, err);
        await db
          .update(scheduledMessages)
          .set({
            status: "failed",
            failureReason: "Internal error",
            updatedAt: new Date(),
          })
          .where(eq(scheduledMessages.id, scheduled.id));

        io.to(`user:${scheduled.userId}`).emit("scheduledMessage:failed", {
          id: scheduled.id,
          channelId: asChannelId(scheduled.channelId),
          failureReason: "Internal error",
        });
      }
    }
  } finally {
    isProcessing = false;
  }
}

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

export function startScheduledMessageProcessor(): void {
  if (schedulerInterval) return;
  schedulerInterval = setInterval(() => {
    processDueScheduledMessages().catch((err) =>
      console.error("Scheduled message processor error:", err),
    );
  }, 30_000);
  console.log("Scheduled message processor started (30s interval)");
}
