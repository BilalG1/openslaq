import { integer, pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { workspaces } from "./schema";
import { users } from "../users/schema";

export const workspaceInvites = pgTable(
  "workspace_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    code: text("code").notNull().unique(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    maxUses: integer("max_uses"), // null = unlimited
    useCount: integer("use_count").notNull().default(0),
    expiresAt: timestamp("expires_at"), // null = never expires
    revokedAt: timestamp("revoked_at"), // null = active
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("idx_workspace_invites_workspace_id").on(t.workspaceId)],
);
