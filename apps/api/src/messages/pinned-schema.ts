import { pgTable, text, timestamp, uuid, primaryKey, index } from "drizzle-orm/pg-core";
import { channels } from "../channels/schema";
import { messages } from "./schema";
import { users } from "../users/schema";

export const pinnedMessages = pgTable(
  "pinned_messages",
  {
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    pinnedBy: text("pinned_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    pinnedAt: timestamp("pinned_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.channelId, t.messageId] }),
    index("idx_pinned_messages_channel_id").on(t.channelId),
  ],
);
