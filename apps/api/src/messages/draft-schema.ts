import { pgTable, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { channels } from "../channels/schema";
import { users } from "../users/schema";
import { messages } from "./schema";

export const drafts = pgTable(
  "drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull().default(""),
    parentMessageId: uuid("parent_message_id").references(() => messages.id, {
      onDelete: "cascade",
    }),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("idx_drafts_user_channel")
      .on(t.userId, t.channelId)
      .where(sql`${t.parentMessageId} IS NULL`),
    uniqueIndex("idx_drafts_user_thread")
      .on(t.userId, t.channelId, t.parentMessageId)
      .where(sql`${t.parentMessageId} IS NOT NULL`),
  ],
);
