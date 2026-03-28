import { eq, inArray } from "drizzle-orm";
import { Parser } from "htmlparser2";
import { db } from "../db";
import { linkPreviews, messageLinkPreviews } from "./link-preview-schema";
import { getMessageById } from "./service";
import { emitToChannel } from "../lib/emit";
import type { LinkPreview, MessageId, ChannelId } from "@openslaq/shared";

const MAX_URLS = 3;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const FETCH_TIMEOUT_MS = 5000;
const MAX_HTML_BYTES = 50 * 1024; // 50KB

// SSRF protection: block private/reserved IPs
const PRIVATE_IP_REGEX =
  /^(10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[?::1\]?|fc00|fd00|fe80|localhost)/i;

export function isPrivateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return PRIVATE_IP_REGEX.test(parsed.hostname);
  } catch {
    return true;
  }
}

// --- URL extraction ---

export function extractUrls(content: string): string[] {
  const regex = /https?:\/\/[^\s<>)]+/gi;
  const matches = content.match(regex) ?? [];
  const cleaned = matches.map((url) => url.replace(/[.,;:!?)]+$/, ""));
  const unique = [...new Set(cleaned)];
  return unique.slice(0, MAX_URLS);
}

// --- HTML parsing for OG meta ---

interface ParsedMeta {
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogSiteName: string | null;
  title: string | null;
  favicon: string | null;
}

export function parseHtmlMeta(html: string): ParsedMeta {
  const result: ParsedMeta = {
    ogTitle: null,
    ogDescription: null,
    ogImage: null,
    ogSiteName: null,
    title: null,
    favicon: null,
  };

  let inTitle = false;
  let titleText = "";
  const parser = new Parser({
    onopentag(name, attrs) {
      if (name === "title" && !result.title) inTitle = true;

      if (name === "meta") {
        const property = attrs.property ?? attrs.name ?? "";
        const content = attrs.content ?? "";
        if (property === "og:title") result.ogTitle = content;
        else if (property === "og:description") result.ogDescription = content;
        else if (property === "og:image") result.ogImage = content;
        else if (property === "og:site_name") result.ogSiteName = content;
        else if (property === "description" && !result.ogDescription) result.ogDescription = content;
      }

      if (name === "link" && !result.favicon) {
        const rel = (attrs.rel ?? "").toLowerCase();
        if (rel.includes("icon")) {
          result.favicon = attrs.href ?? null;
        }
      }
    },
    ontext(text) {
      if (inTitle) titleText += text;
    },
    onclosetag(name) {
      if (name === "title") {
        inTitle = false;
        if (!result.title) result.title = titleText.trim();
      }
    },
  });

  parser.write(html);
  parser.end();

  return result;
}

// --- Fetching ---

export async function fetchPreview(url: string): Promise<Omit<typeof linkPreviews.$inferInsert, "url">> {
  if (isPrivateUrl(url)) {
    return { fetchError: "private IP blocked", fetchedAt: new Date() };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "OpenSlaq/1.0" },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { fetchError: `HTTP ${response.status}`, fetchedAt: new Date() };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return { fetchError: "not HTML", fetchedAt: new Date() };
    }

    // Read limited body
    const reader = response.body?.getReader();
    if (!reader) {
      return { fetchError: "no body", fetchedAt: new Date() };
    }

    let html = "";
    let bytesRead = 0;
    const decoder = new TextDecoder();

    while (bytesRead < MAX_HTML_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      html += decoder.decode(value, { stream: true });
    }
    reader.cancel().catch(() => {});

    const meta = parseHtmlMeta(html);

    const title = meta.ogTitle ?? meta.title;
    if (!title) {
      return { fetchError: "no title", fetchedAt: new Date() };
    }

    // Resolve relative favicon URL
    let faviconUrl = meta.favicon;
    if (faviconUrl && !faviconUrl.startsWith("http")) {
      try {
        faviconUrl = new URL(faviconUrl, url).href;
      } catch {
        faviconUrl = null;
      }
    }

    // Resolve relative image URL
    let imageUrl = meta.ogImage;
    if (imageUrl && !imageUrl.startsWith("http")) {
      try {
        imageUrl = new URL(imageUrl, url).href;
      } catch {
        imageUrl = null;
      }
    }

    return {
      title,
      description: meta.ogDescription,
      imageUrl,
      siteName: meta.ogSiteName,
      faviconUrl: faviconUrl ?? `${new URL(url).origin}/favicon.ico`,
      fetchedAt: new Date(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return { fetchError: message, fetchedAt: new Date() };
  }
}

// --- Cache layer ---

async function getOrFetchPreview(url: string): Promise<typeof linkPreviews.$inferSelect | null> {
  // Check cache
  const cached = await db.query.linkPreviews.findFirst({
    where: eq(linkPreviews.url, url),
  });

  if (cached) {
    const age = Date.now() - cached.fetchedAt.getTime();
    if (age < CACHE_TTL_MS) {
      return cached.fetchError ? null : cached;
    }
  }

  // Fetch and upsert
  const preview = await fetchPreview(url);

  await db
    .insert(linkPreviews)
    .values({ url, ...preview })
    .onConflictDoUpdate({
      target: linkPreviews.url,
      set: preview,
    });

  if (preview.fetchError) return null;

  return {
    url,
    title: preview.title ?? null,
    description: preview.description ?? null,
    imageUrl: preview.imageUrl ?? null,
    siteName: preview.siteName ?? null,
    faviconUrl: preview.faviconUrl ?? null,
    fetchedAt: preview.fetchedAt ?? new Date(),
    fetchError: null,
  };
}

// --- Batch loader (for message list hydration) ---

export async function batchLinkPreviews(
  messageIds: string[],
): Promise<Map<string, LinkPreview[]>> {
  if (messageIds.length === 0) return new Map();

  const rows = await db
    .select({
      messageId: messageLinkPreviews.messageId,
      position: messageLinkPreviews.position,
      url: linkPreviews.url,
      title: linkPreviews.title,
      description: linkPreviews.description,
      imageUrl: linkPreviews.imageUrl,
      siteName: linkPreviews.siteName,
      faviconUrl: linkPreviews.faviconUrl,
    })
    .from(messageLinkPreviews)
    .innerJoin(linkPreviews, eq(messageLinkPreviews.url, linkPreviews.url))
    .where(inArray(messageLinkPreviews.messageId, messageIds));

  const map = new Map<string, LinkPreview[]>();
  // Group by messageId and sort by position
  for (const row of rows) {
    const list = map.get(row.messageId) ?? [];
    list.push({
      url: row.url,
      title: row.title,
      description: row.description,
      imageUrl: row.imageUrl,
      siteName: row.siteName,
      faviconUrl: row.faviconUrl,
    });
    map.set(row.messageId, list);
  }

  // Sort each list by position
  for (const list of map.values()) {
    list.sort((a, b) => {
      const aRow = rows.find((r) => r.url === a.url);
      const bRow = rows.find((r) => r.url === b.url);
      return (aRow?.position ?? 0) - (bRow?.position ?? 0);
    });
  }

  return map;
}

// --- Unfurl (fire-and-forget after message creation) ---

export async function unfurlMessageLinks(
  messageId: MessageId,
  channelId: ChannelId,
  content: string,
): Promise<void> {
  const urls = extractUrls(content);
  if (urls.length === 0) return;

  // Fetch all previews in parallel
  const results = await Promise.allSettled(urls.map((url) => getOrFetchPreview(url)));
  const validPreviews: { url: string; position: number }[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i]!;
    if (result.status === "fulfilled" && result.value) {
      validPreviews.push({ url: urls[i]!, position: i });
    }
  }

  if (validPreviews.length === 0) return;

  // Insert join rows
  await db
    .insert(messageLinkPreviews)
    .values(validPreviews.map((p) => ({ messageId, url: p.url, position: p.position })))
    .onConflictDoNothing();

  // Re-hydrate full message and emit update
  const updatedMessage = await getMessageById(messageId);
  if (updatedMessage) {
    emitToChannel(channelId, "message:updated", updatedMessage);
  }
}

export async function reUnfurlMessageLinks(
  messageId: MessageId,
  channelId: ChannelId,
  content: string,
): Promise<void> {
  // Delete existing join rows
  await db
    .delete(messageLinkPreviews)
    .where(eq(messageLinkPreviews.messageId, messageId));

  await unfurlMessageLinks(messageId, channelId, content);
}
