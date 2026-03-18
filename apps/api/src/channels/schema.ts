import { boolean, pgTable, text, timestamp, uuid, primaryKey, unique, index, pgEnum } from "drizzle-orm/pg-core";
import { workspaces } from "../workspaces/schema";
import { users } from "../users/schema";

export const channelTypeEnum = pgEnum("channel_type", ["public", "private", "dm", "group_dm"]);

export const channels = pgTable(
  "channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    displayName: text("display_name"),
    type: channelTypeEnum("type").notNull().default("public"),
    isArchived: boolean("is_archived").default(false).notNull(),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique().on(t.workspaceId, t.name, t.type),
    index("idx_channels_workspace_type_archived").on(t.workspaceId, t.type, t.isArchived),
    index("idx_channels_workspace_id").on(t.workspaceId),
  ],
);

export const channelMembers = pgTable(
  "channel_members",
  {
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.channelId, t.userId] }),
    index("idx_channel_members_user_channel").on(t.userId, t.channelId),
  ],
);
