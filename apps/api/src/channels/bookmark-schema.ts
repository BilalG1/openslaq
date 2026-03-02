import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { channels } from "./schema";
import { users } from "../users/schema";

export const channelBookmarks = pgTable(
  "channel_bookmarks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    title: text("title").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("idx_channel_bookmarks_channel").on(t.channelId)],
);
