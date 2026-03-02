import { pgTable, text, timestamp, uuid, index, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { channels } from "../channels/schema";
import { users } from "../users/schema";

export const scheduledMessageStatusEnum = pgEnum("scheduled_message_status", [
  "pending",
  "sent",
  "failed",
]);

export const scheduledMessages = pgTable(
  "scheduled_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    attachmentIds: jsonb("attachment_ids").$type<string[]>().default([]),
    scheduledFor: timestamp("scheduled_for").notNull(),
    status: scheduledMessageStatusEnum("status").notNull().default("pending"),
    failureReason: text("failure_reason"),
    sentMessageId: uuid("sent_message_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_scheduled_messages_status_scheduled_for").on(t.status, t.scheduledFor),
    index("idx_scheduled_messages_user_status").on(t.userId, t.status),
    index("idx_scheduled_messages_channel_user_status").on(t.channelId, t.userId, t.status),
  ],
);
