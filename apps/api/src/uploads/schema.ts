import { pgTable, text, timestamp, uuid, integer, index } from "drizzle-orm/pg-core";
import { messages } from "../messages/schema";
import { users } from "../users/schema";

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id").references(() => messages.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    uploadedBy: text("uploaded_by")
      .references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("attachments_message_id_idx").on(table.messageId),
    index("attachments_uploaded_by_idx").on(table.uploadedBy),
    index("attachments_created_at_desc_idx").on(table.createdAt.desc()),
  ],
);
