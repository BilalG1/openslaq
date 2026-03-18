import { eq, and, isNull, isNotNull, or, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { attachments } from "./schema";

export const MAX_STORAGE_PER_USER_BYTES = 1_073_741_824; // 1 GB

export async function getUserStorageUsage(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<string>`COALESCE(SUM(${attachments.size}), 0)` })
    .from(attachments)
    .where(eq(attachments.uploadedBy, userId));
  return Number(row?.total ?? 0);
}
import { channels, channelMembers } from "../channels/schema";
import { messages } from "../messages/schema";
import { workspaceMembers } from "../workspaces/schema";
import { uploadToS3, getPresignedDownloadUrl, deleteFromS3 } from "./s3";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;

function sanitizeFilename(name: string): string {
  // Remove path separators and null bytes, keep only the basename
  // eslint-disable-next-line no-control-regex
  return name.replace(/[\\/\0]/g, "_").replace(/^\.+/, "_");
}

export async function createAttachment(
  file: { name: string; type: string; bytes: Uint8Array },
  userId: string,
) {
  const safeName = sanitizeFilename(file.name);
  const key = `uploads/${userId}/${crypto.randomUUID()}/${safeName}`;
  await uploadToS3(key, file.bytes, file.type);

  const [attachment] = await db
    .insert(attachments)
    .values({
      storageKey: key,
      filename: file.name,
      mimeType: file.type,
      size: file.bytes.length,
      uploadedBy: userId,
    })
    .returning();

  if (!attachment) throw new Error("Failed to insert attachment");
  return attachment;
}

export async function getAttachmentById(id: string) {
  return db.query.attachments.findFirst({
    where: eq(attachments.id, id),
  });
}

export function getDownloadUrl(storageKey: string): string {
  return getPresignedDownloadUrl(storageKey);
}

export async function linkAttachmentsToMessage(
  attachmentIds: string[],
  messageId: string,
  userId: string,
  tx: Tx = db,
): Promise<number> {
  if (attachmentIds.length === 0) return 0;

  const rows = await tx
    .update(attachments)
    .set({ messageId })
    .where(
      and(
        inArray(attachments.id, attachmentIds),
        eq(attachments.uploadedBy, userId),
        isNull(attachments.messageId),
      ),
    )
    .returning({ id: attachments.id });

  return rows.length;
}

export async function getAttachmentsForMessages(messageIds: string[], tx: Tx = db) {
  if (messageIds.length === 0) return [];

  return tx.query.attachments.findMany({
    where: inArray(attachments.messageId, messageIds),
  });
}

export async function deleteAttachmentsForMessage(messageId: string, tx: Tx = db) {
  const rows = await tx.query.attachments.findMany({
    where: eq(attachments.messageId, messageId),
  });

  await Promise.all(rows.map((row) => deleteFromS3(row.storageKey)));
}

export async function canAccessAttachment(
  attachment: { messageId: string | null; uploadedBy: string | null },
  userId: string,
): Promise<boolean> {
  if (!attachment.messageId) {
    return attachment.uploadedBy === userId;
  }

  const [row] = await db
    .select({ one: sql<number>`1` })
    .from(messages)
    .innerJoin(channels, eq(channels.id, messages.channelId))
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
    .where(
      and(
        eq(messages.id, attachment.messageId),
        // Public channels: workspace membership is sufficient
        // Private/DM channels: must also be a channel member
        or(
          eq(channels.type, "public"),
          isNotNull(channelMembers.userId),
        ),
      ),
    )
    .limit(1);

  return !!row;
}

