import { pgTable, text, timestamp, uuid, boolean, index } from "drizzle-orm/pg-core";
import { workspaces } from "../workspaces/schema";
import { users } from "../users/schema";

export const marketplaceListings = pgTable(
  "marketplace_listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    longDescription: text("long_description"),
    avatarUrl: text("avatar_url"),
    category: text("category"),
    clientId: text("client_id").notNull().unique(),
    clientSecret: text("client_secret").notNull(), // SHA256 hash
    redirectUri: text("redirect_uri").notNull(),
    webhookUrl: text("webhook_url").notNull(),
    requestedScopes: text("requested_scopes").array().notNull(),
    requestedEvents: text("requested_events").array().notNull(),
    published: boolean("published").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_marketplace_listings_slug").on(t.slug),
    index("idx_marketplace_listings_client_id").on(t.clientId),
  ],
);

export const marketplaceAuthCodes = pgTable(
  "marketplace_auth_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => marketplaceListings.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    authorizedBy: text("authorized_by")
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_marketplace_auth_codes_code").on(t.code),
    index("idx_marketplace_auth_codes_listing_id").on(t.listingId),
  ],
);
