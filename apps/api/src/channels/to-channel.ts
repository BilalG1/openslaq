import type { Channel } from "@openslaq/shared";
import { asChannelId, asWorkspaceId, asUserId } from "@openslaq/shared";
import type { channels } from "./schema";

export function toChannel(row: typeof channels.$inferSelect, memberCount?: number): Channel {
  return {
    id: asChannelId(row.id),
    workspaceId: asWorkspaceId(row.workspaceId),
    name: row.name,
    type: row.type,
    description: row.description,
    displayName: row.displayName ?? null,
    isArchived: row.isArchived,
    createdBy: row.createdBy ? asUserId(row.createdBy) : null,
    createdAt: row.createdAt.toISOString(),
    memberCount,
  };
}
