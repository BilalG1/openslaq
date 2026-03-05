import { pgTable, text, timestamp, uuid, primaryKey, pgEnum, index } from "drizzle-orm/pg-core";
import { users } from "../users/schema";

export const workspaceRoleEnum = pgEnum("workspace_role", ["owner", "admin", "member"]);

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: workspaceRoleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.workspaceId, t.userId] }),
    index("idx_workspace_members_user_id").on(t.userId),
  ],
);
