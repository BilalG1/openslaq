import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { workspaces } from "../../workspaces/schema";
import { users } from "../../users/schema";
import { channels } from "../../channels/schema";

export const vercelConnections = pgTable(
  "vercel_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    vercelTeamId: text("vercel_team_id").notNull(),
    vercelTeamSlug: text("vercel_team_slug").notNull(),
    vercelConfigurationId: text("vercel_configuration_id").notNull(),
    accessToken: text("access_token").notNull(),
    connectedBy: text("connected_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_vercel_connections_workspace_id").on(t.workspaceId),
    index("idx_vercel_connections_team_id").on(t.vercelTeamId),
  ],
);

export const vercelSubscriptions = pgTable(
  "vercel_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    vercelConnectionId: uuid("vercel_connection_id").references(
      () => vercelConnections.id,
      { onDelete: "set null" },
    ),
    projectName: text("project_name").notNull(),
    projectId: text("project_id").notNull(),
    enabledEvents: text("enabled_events").array().notNull(), // ["deployments","projects","domains","alerts"]
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_vercel_subscriptions_workspace_id").on(t.workspaceId),
    index("idx_vercel_subscriptions_channel_id").on(t.channelId),
    index("idx_vercel_subscriptions_project_id").on(t.projectId),
  ],
);
