import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const rateLimitEntries = pgTable("rate_limit_entries", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(1),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
});
