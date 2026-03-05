import { boolean, pgTable, text, timestamp, uuid, pgEnum, index } from "drizzle-orm/pg-core";
import { users } from "../users/schema";

export const pushPlatformEnum = pgEnum("push_platform", ["ios"]);

export const pushTokens = pgTable(
  "push_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    platform: pushPlatformEnum("platform").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_push_tokens_user_id").on(t.userId)],
);

export const notificationPreferences = pgTable("notification_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  pushEnabled: boolean("push_enabled").default(true).notNull(),
  soundEnabled: boolean("sound_enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
