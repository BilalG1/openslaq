import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { workspaces } from "../../workspaces/schema";
import { users } from "../../users/schema";
import { channels } from "../../channels/schema";

export const githubInstallations = pgTable(
  "github_installations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    githubInstallationId: text("github_installation_id").notNull(),
    githubAccountLogin: text("github_account_login").notNull(),
    githubAccountType: text("github_account_type").notNull(), // "Organization" | "User"
    installedBy: text("installed_by")
      .notNull()
      .references(() => users.id),
    accessToken: text("access_token"), // refreshed installation token
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_github_installations_workspace_id").on(t.workspaceId),
    index("idx_github_installations_github_id").on(t.githubInstallationId),
  ],
);

export const githubSubscriptions = pgTable(
  "github_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    githubInstallationId: uuid("github_installation_id").references(
      () => githubInstallations.id,
      { onDelete: "set null" },
    ),
    repoFullName: text("repo_full_name").notNull(), // "owner/repo"
    enabledEvents: text("enabled_events").array().notNull(), // ["pulls","reviews","checks"]
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_github_subscriptions_workspace_id").on(t.workspaceId),
    index("idx_github_subscriptions_channel_id").on(t.channelId),
    index("idx_github_subscriptions_repo").on(t.repoFullName),
  ],
);
