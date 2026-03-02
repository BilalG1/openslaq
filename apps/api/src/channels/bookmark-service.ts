import { eq, and, asc } from "drizzle-orm";
import { db } from "../db";
import { channelBookmarks } from "./bookmark-schema";
import type { ChannelId, UserId } from "@openslaq/shared";

export async function addBookmark(
  channelId: ChannelId,
  url: string,
  title: string,
  createdBy: UserId,
) {
  const [row] = await db
    .insert(channelBookmarks)
    .values({ channelId, url, title, createdBy })
    .returning();
  return row!;
}

export async function removeBookmark(
  channelId: ChannelId,
  bookmarkId: string,
): Promise<boolean> {
  const result = await db
    .delete(channelBookmarks)
    .where(
      and(
        eq(channelBookmarks.id, bookmarkId),
        eq(channelBookmarks.channelId, channelId),
      ),
    )
    .returning({ id: channelBookmarks.id });
  return result.length > 0;
}

export async function getBookmarks(channelId: ChannelId) {
  return db
    .select()
    .from(channelBookmarks)
    .where(eq(channelBookmarks.channelId, channelId))
    .orderBy(asc(channelBookmarks.createdAt));
}
