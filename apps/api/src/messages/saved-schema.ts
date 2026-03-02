import { pgTable, text, timestamp, uuid, primaryKey, index } from "drizzle-orm/pg-core";
import { messages } from "./schema";
import { users } from "../users/schema";

export const savedMessages = pgTable(
  "saved_messages",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    savedAt: timestamp("saved_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.messageId] }),
    index("idx_saved_messages_user_id").on(t.userId),
  ],
);
