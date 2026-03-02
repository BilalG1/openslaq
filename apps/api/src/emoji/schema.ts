import { pgTable, text, timestamp, uuid, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { workspaces } from "../workspaces/schema";
import { users } from "../users/schema";

export const customEmojis = pgTable(
  "custom_emojis",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    uploadedBy: text("uploaded_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("custom_emojis_workspace_name_idx").on(table.workspaceId, table.name),
    index("custom_emojis_workspace_id_idx").on(table.workspaceId),
  ],
);
