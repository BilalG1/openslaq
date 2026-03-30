import { pgTable, bigserial, timestamp, customType } from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const socketIoAttachments = pgTable("socket_io_attachments", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  payload: bytea("payload"),
});
