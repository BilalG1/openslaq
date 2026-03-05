import { eq, and, desc, isNotNull, or, lt, like, sql } from "drizzle-orm";
import { db } from "../db";
import { attachments } from "./schema";
import { messages } from "../messages/schema";
import { channels, channelMembers } from "../channels/schema";
import { users } from "../users/schema";
import { workspaceMembers } from "../workspaces/schema";
import { getPresignedDownloadUrl } from "./s3";
import type { FileCategory, FileBrowserItem } from "@openslaq/shared";

function categorizeFromMime(mime: string): FileCategory {
  if (mime.startsWith("image/")) return "images";
  if (mime.startsWith("video/")) return "videos";
  if (mime.startsWith("audio/")) return "audio";
  if (
    mime.startsWith("application/pdf") ||
    mime.startsWith("application/msword") ||
    mime.startsWith("application/vnd.openxmlformats") ||
    mime.startsWith("application/vnd.ms-") ||
    mime.startsWith("text/")
  )
    return "documents";
  return "other";
}

const CATEGORY_MIME_PATTERNS: Record<FileCategory, string[]> = {
  images: ["image/%"],
  videos: ["video/%"],
  audio: ["audio/%"],
  documents: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats%",
    "application/vnd.ms-%",
    "text/%",
  ],
  other: [],
};

export async function browseFiles({
  workspaceId,
  userId,
  channelId,
  category,
  cursor,
  limit = 50,
}: {
  workspaceId: string;
  userId: string;
  channelId?: string;
  category?: FileCategory;
  cursor?: string;
  limit?: number;
}): Promise<{ files: FileBrowserItem[]; nextCursor: string | null }> {
  const conditions = [
    isNotNull(attachments.messageId),
    eq(channels.workspaceId, workspaceId),
    // Access control: public channels OR channels user is a member of
    or(
      eq(channels.type, "public"),
      isNotNull(channelMembers.userId),
    ),
  ];

  if (channelId) {
    conditions.push(eq(channels.id, channelId));
  }

  if (cursor) {
    conditions.push(lt(attachments.createdAt, new Date(cursor)));
  }

  if (category && category !== "other") {
    const patterns = CATEGORY_MIME_PATTERNS[category];
    if (patterns.length > 0) {
      const likeConds = patterns.map((p) => like(attachments.mimeType, p));
      conditions.push(or(...likeConds)!);
    }
  } else if (category === "other") {
    // Exclude all known categories
    const excludePatterns = [
      ...CATEGORY_MIME_PATTERNS.images,
      ...CATEGORY_MIME_PATTERNS.videos,
      ...CATEGORY_MIME_PATTERNS.audio,
      ...CATEGORY_MIME_PATTERNS.documents,
    ];
    for (const p of excludePatterns) {
      conditions.push(sql`${attachments.mimeType} NOT LIKE ${p}`);
    }
  }

  const rows = await db
    .select({
      id: attachments.id,
      filename: attachments.filename,
      mimeType: attachments.mimeType,
      size: attachments.size,
      uploadedBy: attachments.uploadedBy,
      uploaderName: users.displayName,
      channelId: channels.id,
      channelName: channels.name,
      messageId: attachments.messageId,
      createdAt: attachments.createdAt,
      storageKey: attachments.storageKey,
    })
    .from(attachments)
    .innerJoin(messages, eq(attachments.messageId, messages.id))
    .innerJoin(channels, eq(messages.channelId, channels.id))
    .leftJoin(users, eq(attachments.uploadedBy, users.id))
    .innerJoin(
      workspaceMembers,
      and(
        eq(workspaceMembers.workspaceId, channels.workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .leftJoin(
      channelMembers,
      and(
        eq(channelMembers.channelId, channels.id),
        eq(channelMembers.userId, userId),
      ),
    )
    .where(and(...conditions))
    .orderBy(desc(attachments.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit);

  const files: FileBrowserItem[] = items.map((row) => ({
    id: row.id as FileBrowserItem["id"],
    filename: row.filename,
    mimeType: row.mimeType,
    size: row.size,
    category: categorizeFromMime(row.mimeType),
    downloadUrl: getPresignedDownloadUrl(row.storageKey),
    uploadedBy: (row.uploadedBy ?? null) as FileBrowserItem["uploadedBy"],
    uploaderName: row.uploaderName ?? "Deleted User",
    channelId: row.channelId as FileBrowserItem["channelId"],
    channelName: row.channelName,
    messageId: row.messageId as FileBrowserItem["messageId"],
    createdAt: row.createdAt.toISOString(),
  }));

  const nextCursor = hasMore && files.length > 0
    ? files[files.length - 1]!.createdAt
    : null;

  return { files, nextCursor };
}
