import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { workspaces } from "../../workspaces/schema";
import { users } from "../../users/schema";
import { channels } from "../../channels/schema";

export const sentryConnections = pgTable(
  "sentry_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    sentryOrganizationSlug: text("sentry_organization_slug").notNull(),
    sentryInstallationId: text("sentry_installation_id").notNull(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token").notNull(),
    tokenExpiresAt: timestamp("token_expires_at").notNull(),
    connectedBy: text("connected_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_sentry_connections_workspace_id").on(t.workspaceId),
    index("idx_sentry_connections_org_slug").on(t.sentryOrganizationSlug),
  ],
);

export const sentrySubscriptions = pgTable(
  "sentry_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    sentryConnectionId: uuid("sentry_connection_id").references(
      () => sentryConnections.id,
      { onDelete: "set null" },
    ),
    projectSlug: text("project_slug").notNull(),
    projectId: text("project_id").notNull(),
    enabledEvents: text("enabled_events").array().notNull(), // ["issues","metrics","deploys"]
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_sentry_subscriptions_workspace_id").on(t.workspaceId),
    index("idx_sentry_subscriptions_channel_id").on(t.channelId),
    index("idx_sentry_subscriptions_project_id").on(t.projectId),
  ],
);
