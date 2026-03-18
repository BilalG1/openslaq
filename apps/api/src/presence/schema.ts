import { pgTable, text, timestamp, primaryKey, index } from "drizzle-orm/pg-core";

export const presenceConnections = pgTable(
  "presence_connections",
  {
    userId: text("user_id").notNull(),
    socketId: text("socket_id").notNull(),
    lastHeartbeat: timestamp("last_heartbeat", { withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.socketId] }),
    index("idx_presence_user_id").on(t.userId),
  ],
);
