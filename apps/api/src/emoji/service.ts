import { eq, and } from "drizzle-orm";
import sharp from "sharp";
import { db } from "../db";
import { customEmojis } from "./schema";
import { uploadToS3, getPresignedDownloadUrl, deleteFromS3 } from "../uploads/s3";

const EMOJI_NAME_REGEX = /^[a-z0-9][a-z0-9_-]{0,30}[a-z0-9]$/;
const MAX_EMOJI_SIZE = 512 * 1024; // 512KB
const PRESIGNED_URL_EXPIRY = 7 * 24 * 3600; // 7 days

export function isValidEmojiName(name: string): boolean {
  return EMOJI_NAME_REGEX.test(name);
}

export function isImageMimeType(mime: string): boolean {
  return mime.startsWith("image/");
}

export { MAX_EMOJI_SIZE };

export async function listCustomEmojis(workspaceId: string) {
  const rows = await db
    .select()
    .from(customEmojis)
    .where(eq(customEmojis.workspaceId, workspaceId))
    .orderBy(customEmojis.name);

  return rows.map((row) => ({
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    url: getPresignedDownloadUrl(row.storageKey, PRESIGNED_URL_EXPIRY),
    uploadedBy: row.uploadedBy,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function createCustomEmoji(
  workspaceId: string,
  name: string,
  file: { bytes: Uint8Array; type: string },
  userId: string,
) {
  // Resize to 128x128 PNG
  const resized = await sharp(file.bytes)
    .resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const storageKey = `emoji/${workspaceId}/${crypto.randomUUID()}.png`;
  await uploadToS3(storageKey, new Uint8Array(resized), "image/png");

  const [row] = await db
    .insert(customEmojis)
    .values({
      workspaceId,
      name,
      storageKey,
      mimeType: "image/png",
      size: resized.length,
      uploadedBy: userId,
    })
    .returning();

  return {
    id: row!.id,
    workspaceId: row!.workspaceId,
    name: row!.name,
    url: getPresignedDownloadUrl(storageKey, PRESIGNED_URL_EXPIRY),
    uploadedBy: row!.uploadedBy,
    createdAt: row!.createdAt.toISOString(),
  };
}

export async function deleteCustomEmoji(workspaceId: string, emojiId: string) {
  const [row] = await db
    .select({ storageKey: customEmojis.storageKey })
    .from(customEmojis)
    .where(and(eq(customEmojis.id, emojiId), eq(customEmojis.workspaceId, workspaceId)));

  if (!row) return false;

  await deleteFromS3(row.storageKey);
  await db
    .delete(customEmojis)
    .where(and(eq(customEmojis.id, emojiId), eq(customEmojis.workspaceId, workspaceId)));

  return true;
}

export async function getCustomEmojiByName(workspaceId: string, name: string) {
  const [row] = await db
    .select()
    .from(customEmojis)
    .where(and(eq(customEmojis.workspaceId, workspaceId), eq(customEmojis.name, name)));

  return row ?? null;
}
