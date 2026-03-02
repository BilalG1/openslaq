import { pgTable, text, timestamp, uuid, boolean, index, jsonb } from "drizzle-orm/pg-core";
import { botApps } from "../bots/schema";

export const botSlashCommands = pgTable(
  "bot_slash_commands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    botAppId: uuid("bot_app_id")
      .notNull()
      .references(() => botApps.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    usage: text("usage").notNull().default(""),
    arguments: jsonb("arguments").$type<Array<{ name: string; description: string; required?: boolean }>>(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_bot_slash_commands_bot_app_id").on(t.botAppId),
    index("idx_bot_slash_commands_name").on(t.name),
  ],
);
