import { pgTable, text, timestamp, uuid, boolean, index, jsonb } from "drizzle-orm/pg-core";
import { workspaces } from "../workspaces/schema";
import { users } from "../users/schema";
import { messages } from "../messages/schema";
import { marketplaceListings } from "../marketplace/schema";

export const botApps = pgTable(
  "bot_apps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id),
    name: text("name").notNull(),
    description: text("description"),
    avatarUrl: text("avatar_url"),
    webhookUrl: text("webhook_url").notNull(),
    apiToken: text("api_token").notNull(), // sha256 hash
    apiTokenPrefix: text("api_token_prefix").notNull(), // first 8 chars for display
    scopes: text("scopes").array().notNull(),
    enabled: boolean("enabled").notNull().default(true),
    marketplaceListingId: uuid("marketplace_listing_id").references(
      () => marketplaceListings.id,
      { onDelete: "set null" },
    ),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_bot_apps_workspace_id").on(t.workspaceId),
    index("idx_bot_apps_api_token").on(t.apiToken),
    index("idx_bot_apps_user_id").on(t.userId),
  ],
);

export const botEventSubscriptions = pgTable(
  "bot_event_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    botAppId: uuid("bot_app_id")
      .notNull()
      .references(() => botApps.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
  },
  (t) => [
    index("idx_bot_event_subscriptions_bot_app_id").on(t.botAppId),
    index("idx_bot_event_subscriptions_event_type").on(t.eventType),
  ],
);

export const messageActions = pgTable(
  "message_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    botAppId: uuid("bot_app_id")
      .notNull()
      .references(() => botApps.id, { onDelete: "cascade" }),
    actions: jsonb("actions").notNull(), // MessageActionButton[]
  },
  (t) => [index("idx_message_actions_message_id").on(t.messageId)],
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    botAppId: uuid("bot_app_id")
      .notNull()
      .references(() => botApps.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    statusCode: text("status_code"),
    attempts: text("attempts").notNull().default("0"),
    lastAttemptAt: timestamp("last_attempt_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("idx_webhook_deliveries_bot_app_id").on(t.botAppId)],
);
