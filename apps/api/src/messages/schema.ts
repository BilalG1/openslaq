import { pgTable, text, timestamp, uuid, index, primaryKey, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { channels } from "../channels/schema";
import { users } from "../users/schema";

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    type: text("type"),
    metadata: jsonb("metadata"),
    parentMessageId: uuid("parent_message_id"),
    sharedMessageId: uuid("shared_message_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_messages_channel_toplevel_user_created")
      .on(table.channelId, sql`${table.createdAt} DESC`, table.userId)
      .where(sql`${table.parentMessageId} IS NULL`),
    index("idx_messages_parent_created_at").on(
      table.parentMessageId,
      table.createdAt,
    ),
    index("idx_messages_user_id").on(table.userId),
  ],
);

export const messageMentions = pgTable(
  "message_mentions",
  {
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // 'user' | 'here' | 'channel'
  },
  (table) => [
    primaryKey({ columns: [table.messageId, table.userId] }),
    index("idx_message_mentions_user_id").on(table.userId),
    index("idx_message_mentions_message_id").on(table.messageId),
  ],
);
