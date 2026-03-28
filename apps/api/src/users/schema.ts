import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"), // only used when AUTH_MODE=builtin
  avatarUrl: text("avatar_url"),
  lastSeenAt: timestamp("last_seen_at"),
  statusEmoji: text("status_emoji"),
  statusText: text("status_text"),
  statusExpiresAt: timestamp("status_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
