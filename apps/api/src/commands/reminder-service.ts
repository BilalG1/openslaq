import { eq, and, lte } from "drizzle-orm";
import { db } from "../db";
import { reminders } from "./reminder-schema";
import { channels } from "../channels/schema";
import { getOrCreateSlaqbot } from "./slaqbot";
import { getOrCreateDm } from "../dm/service";
import { createMessage } from "../messages/service";
import { emitToChannel } from "../lib/emit";
import { asChannelId, asUserId, asWorkspaceId } from "@openslaq/shared";
import { captureException } from "../sentry";

let isProcessing = false;

export async function processDueReminders(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const dueReminders = await db
      .select({
        reminder: reminders,
        workspaceId: channels.workspaceId,
      })
      .from(reminders)
      .innerJoin(channels, eq(reminders.channelId, channels.id))
      .where(
        and(
          eq(reminders.status, "pending"),
          lte(reminders.remindAt, new Date()),
        ),
      )
      .limit(20);

    for (const { reminder, workspaceId } of dueReminders) {
      try {
        const slaqbot = await getOrCreateSlaqbot(workspaceId);

        // Get or create DM between Slaqbot and user
        const dmResult = await getOrCreateDm(
          asWorkspaceId(workspaceId),
          asUserId(slaqbot.id),
          asUserId(reminder.userId),
        );

        if (!dmResult) {
          // Mark as failed (user may have left workspace)
          await db
            .update(reminders)
            .set({ status: "sent" })
            .where(eq(reminders.id, reminder.id));
          continue;
        }

        // Send reminder message
        const content = `Reminder: ${reminder.text}`;
        const message = await createMessage(
          asChannelId(dmResult.channel.id),
          asUserId(slaqbot.id),
          content,
          [],
        );
        if ("error" in message) continue;

        // Emit message:new to user
        emitToChannel(asChannelId(dmResult.channel.id), "message:new", message);

        // Mark reminder as sent
        await db
          .update(reminders)
          .set({ status: "sent" })
          .where(eq(reminders.id, reminder.id));
      } catch (err) {
        captureException(err, { userId: reminder.userId, channelId: reminder.channelId, workspaceId, op: "reminder:process" });
      }
    }
  } finally {
    isProcessing = false;
  }
}

let reminderInterval: ReturnType<typeof setInterval> | null = null;

export function startReminderProcessor(): void {
  if (reminderInterval) return;
  reminderInterval = setInterval(() => {
    processDueReminders().catch((err) =>
      captureException(err, { op: "reminder:poll" }),
    );
  }, 30_000);
  console.log("Reminder processor started (30s interval)");
}
