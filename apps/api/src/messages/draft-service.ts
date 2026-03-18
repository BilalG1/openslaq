import { eq, and, isNull, desc } from "drizzle-orm";
import { db } from "../db";
import { drafts } from "./draft-schema";
import { channels } from "../channels/schema";

export interface DraftRow {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  parentMessageId: string | null;
  updatedAt: string;
  createdAt: string;
}

function toDraft(row: typeof drafts.$inferSelect): DraftRow {
  return {
    id: row.id,
    channelId: row.channelId,
    userId: row.userId,
    content: row.content,
    parentMessageId: row.parentMessageId,
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function upsertDraft(
  userId: string,
  channelId: string,
  content: string,
  parentMessageId?: string | null,
): Promise<DraftRow> {
  // Use delete + insert pattern since Drizzle doesn't support partial index
  // conflict targets and PostgreSQL ON CONFLICT requires exact index match.
  await db
    .delete(drafts)
    .where(
      parentMessageId
        ? and(
            eq(drafts.userId, userId),
            eq(drafts.channelId, channelId),
            eq(drafts.parentMessageId, parentMessageId),
          )
        : and(
            eq(drafts.userId, userId),
            eq(drafts.channelId, channelId),
            isNull(drafts.parentMessageId),
          ),
    );

  const [row] = await db
    .insert(drafts)
    .values({
      userId,
      channelId,
      content,
      parentMessageId: parentMessageId ?? null,
    })
    .returning();
  return toDraft(row!);
}

export async function getDraftsForUser(
  userId: string,
  workspaceId: string,
): Promise<Array<DraftRow & { channelName: string }>> {
  const rows = await db
    .select({
      draft: drafts,
      channelName: channels.name,
    })
    .from(drafts)
    .innerJoin(channels, eq(drafts.channelId, channels.id))
    .where(
      and(eq(drafts.userId, userId), eq(channels.workspaceId, workspaceId)),
    )
    .orderBy(desc(drafts.updatedAt));

  return rows.map((r) => ({
    ...toDraft(r.draft),
    channelName: r.channelName,
  }));
}

export async function deleteDraft(
  id: string,
  userId: string,
): Promise<boolean> {
  const result = await db
    .delete(drafts)
    .where(and(eq(drafts.id, id), eq(drafts.userId, userId)))
    .returning();
  return result.length > 0;
}

export async function deleteDraftByKey(
  userId: string,
  channelId: string,
  parentMessageId?: string | null,
): Promise<boolean> {
  const conditions = [eq(drafts.userId, userId), eq(drafts.channelId, channelId)];
  if (parentMessageId) {
    conditions.push(eq(drafts.parentMessageId, parentMessageId));
  } else {
    conditions.push(isNull(drafts.parentMessageId));
  }
  const result = await db
    .delete(drafts)
    .where(and(...conditions))
    .returning();
  return result.length > 0;
}

export async function getDraftForChannel(
  userId: string,
  channelId: string,
  parentMessageId?: string | null,
): Promise<DraftRow | null> {
  const conditions = [eq(drafts.userId, userId), eq(drafts.channelId, channelId)];
  if (parentMessageId) {
    conditions.push(eq(drafts.parentMessageId, parentMessageId));
  } else {
    conditions.push(isNull(drafts.parentMessageId));
  }
  const row = await db.query.drafts.findFirst({
    where: and(...conditions),
  });
  return row ? toDraft(row) : null;
}
