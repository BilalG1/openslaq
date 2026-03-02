import { pgTable, text, timestamp, uuid, index, pgEnum } from "drizzle-orm/pg-core";
import { users } from "../users/schema";
import { channels } from "../channels/schema";

export const reminderStatusEnum = pgEnum("reminder_status", ["pending", "sent", "cancelled"]);

export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    remindAt: timestamp("remind_at").notNull(),
    status: reminderStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_reminders_status_remind_at").on(t.status, t.remindAt),
    index("idx_reminders_user_id").on(t.userId),
  ],
);
