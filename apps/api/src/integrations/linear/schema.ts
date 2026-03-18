import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { workspaces } from "../../workspaces/schema";
import { users } from "../../users/schema";
import { channels } from "../../channels/schema";

export const linearConnections = pgTable(
  "linear_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    linearOrganizationId: text("linear_organization_id").notNull(),
    linearOrganizationName: text("linear_organization_name").notNull(),
    accessToken: text("access_token").notNull(),
    connectedBy: text("connected_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_linear_connections_workspace_id").on(t.workspaceId),
    index("idx_linear_connections_org_id").on(t.linearOrganizationId),
  ],
);

export const linearSubscriptions = pgTable(
  "linear_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    linearConnectionId: uuid("linear_connection_id").references(
      () => linearConnections.id,
      { onDelete: "set null" },
    ),
    teamKey: text("team_key").notNull(), // e.g. "BAC"
    teamId: text("team_id").notNull(), // Linear's UUID for webhook matching
    enabledEvents: text("enabled_events").array().notNull(), // ["issues","comments","projects","cycles"]
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_linear_subscriptions_workspace_id").on(t.workspaceId),
    index("idx_linear_subscriptions_channel_id").on(t.channelId),
    index("idx_linear_subscriptions_team_id").on(t.teamId),
  ],
);
