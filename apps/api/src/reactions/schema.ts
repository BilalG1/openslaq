import { pgTable, text, timestamp, uuid, uniqueIndex, index } from "drizzle-orm/pg-core";
import { messages } from "../messages/schema";
import { users } from "../users/schema";

export const reactions = pgTable(
  "reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emoji: text("emoji").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_reactions_message_user_emoji").on(table.messageId, table.userId, table.emoji),
    index("idx_reactions_message_id").on(table.messageId),
  ],
);
