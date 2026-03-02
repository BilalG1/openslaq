import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, createTestWorkspace, addToWorkspace, testId } from "./helpers/api-client";
import type { hc } from "hono/client";
import type { AppType } from "@openslaq/api/app";

function getBaseUrl() {
  return process.env.API_BASE_URL || "http://localhost:3001";
}

function makeTestFile(name: string, content: string, type: string): File {
  return new File([content], name, { type });
}

async function uploadAndLink(
  headers: HeadersInit,
  slug: string,
  channelId: string,
  file: File,
  content: string,
): Promise<{ attachmentId: string; messageId: string }> {
  const form = new FormData();
  form.append("files", file);
  const uploadRes = await fetch(`${getBaseUrl()}/api/uploads`, {
    method: "POST",
    headers,
    body: form,
  });
  const { attachments } = (await uploadRes.json()) as { attachments: { id: string }[] };
  const attachmentId = attachments[0]!.id;

  const msgRes = await fetch(`${getBaseUrl()}/api/workspaces/${slug}/channels/${channelId}/messages`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ content, attachmentIds: [attachmentId] }),
  });
  const msg = (await msgRes.json()) as { id: string };
  return { attachmentId, messageId: msg.id };
}

interface FileBrowserItem {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  category: string;
  downloadUrl: string;
  uploadedBy: string;
  uploaderName: string;
  channelId: string;
  channelName: string;
  messageId: string;
  createdAt: string;
}

interface FileBrowserResponse {
  files: FileBrowserItem[];
  nextCursor: string | null;
}

describe("file browser", () => {
  let client: ReturnType<typeof hc<AppType>>;
  let headers: Record<string, string>;
  let slug: string;
  let channelId: string;
  let channel2Id: string;
  let attachmentId1: string;

  beforeAll(async () => {
    const ctx = await createTestClient({
      id: `fb-user-${testId()}`,
      displayName: "File Browser User",
      email: `fb-${testId()}@openslaq.dev`,
    });
    client = ctx.client;
    headers = ctx.headers;

    const workspace = await createTestWorkspace(ctx.client);
    slug = workspace.slug;

    // Create two channels
    const ch1Res = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `fb-ch1-${testId()}` },
    });
    const ch1 = (await ch1Res.json()) as { id: string };
    channelId = ch1.id;

    const ch2Res = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `fb-ch2-${testId()}` },
    });
    const ch2 = (await ch2Res.json()) as { id: string };
    channel2Id = ch2.id;

    // Upload files to channel 1
    const result1 = await uploadAndLink(
      headers,
      slug,
      channelId,
      makeTestFile("photo.png", "fake png", "image/png"),
      "here's a photo",
    );
    attachmentId1 = result1.attachmentId;

    await uploadAndLink(
      headers,
      slug,
      channelId,
      makeTestFile("doc.pdf", "fake pdf", "application/pdf"),
      "here's a doc",
    );

    // Upload file to channel 2
    await uploadAndLink(
      headers,
      slug,
      channel2Id,
      makeTestFile("song.mp3", "fake mp3", "audio/mpeg"),
      "here's a song",
    );

    // Upload an "other" category file (zip)
    await uploadAndLink(
      headers,
      slug,
      channelId,
      makeTestFile("archive.zip", "fake zip", "application/zip"),
      "here's a zip",
    );
  });

  test("list all files → returns files from both channels", async () => {
    const res = await client.api.workspaces[":slug"].files.$get({
      param: { slug },
      query: {},
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as FileBrowserResponse;
    expect(data.files.length).toBeGreaterThanOrEqual(3);
    expect(data.files.some((f) => f.filename === "photo.png")).toBe(true);
    expect(data.files.some((f) => f.filename === "doc.pdf")).toBe(true);
    expect(data.files.some((f) => f.filename === "song.mp3")).toBe(true);
  });

  test("filter by channel → returns only that channel's files", async () => {
    const res = await client.api.workspaces[":slug"].files.$get({
      param: { slug },
      query: { channelId: channel2Id },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as FileBrowserResponse;
    expect(data.files.every((f) => f.channelId === channel2Id)).toBe(true);
    expect(data.files.some((f) => f.filename === "song.mp3")).toBe(true);
  });

  test("filter by category → returns matching files", async () => {
    const res = await client.api.workspaces[":slug"].files.$get({
      param: { slug },
      query: { category: "images" },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as FileBrowserResponse;
    expect(data.files.every((f) => f.category === "images")).toBe(true);
    expect(data.files.some((f) => f.filename === "photo.png")).toBe(true);
  });

  test("pagination with limit → returns cursor", async () => {
    const res = await client.api.workspaces[":slug"].files.$get({
      param: { slug },
      query: { limit: 1 },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as FileBrowserResponse;
    expect(data.files).toHaveLength(1);
    expect(data.nextCursor).not.toBeNull();

    // Load next page
    const res2 = await client.api.workspaces[":slug"].files.$get({
      param: { slug },
      query: { cursor: data.nextCursor!, limit: 1 },
    });
    expect(res2.status).toBe(200);
    const data2 = (await res2.json()) as FileBrowserResponse;
    expect(data2.files).toHaveLength(1);
    expect(data2.files[0]!.id).not.toBe(data.files[0]!.id);
  });

  test("files include required fields", async () => {
    const res = await client.api.workspaces[":slug"].files.$get({
      param: { slug },
      query: {},
    });
    const data = (await res.json()) as FileBrowserResponse;
    const file = data.files.find((f) => f.id === attachmentId1);
    expect(file).toBeDefined();
    expect(file!.filename).toBe("photo.png");
    expect(file!.mimeType).toBe("image/png");
    expect(file!.category).toBe("images");
    expect(file!.downloadUrl).toBeTruthy();
    expect(file!.uploaderName).toBeTruthy();
    expect(file!.channelId).toBe(channelId);
    expect(file!.channelName).toBeTruthy();
    expect(file!.messageId).toBeTruthy();
    expect(file!.createdAt).toBeTruthy();
  });

  test("unlinked attachments are excluded", async () => {
    // Upload but don't link to a message
    const form = new FormData();
    form.append("files", makeTestFile("unlinked.txt", "orphan", "text/plain"));
    const uploadRes = await fetch(`${getBaseUrl()}/api/uploads`, {
      method: "POST",
      headers,
      body: form,
    });
    const { attachments } = (await uploadRes.json()) as { attachments: { id: string }[] };
    const unlinkedId = attachments[0]!.id;

    const res = await client.api.workspaces[":slug"].files.$get({
      param: { slug },
      query: {},
    });
    const data = (await res.json()) as FileBrowserResponse;
    expect(data.files.some((f) => f.id === unlinkedId)).toBe(false);
  });

  test("filter by category 'other' → returns non-standard MIME types", async () => {
    const res = await client.api.workspaces[":slug"].files.$get({
      param: { slug },
      query: { category: "other" },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as FileBrowserResponse;
    expect(data.files.every((f) => f.category === "other")).toBe(true);
    expect(data.files.some((f) => f.filename === "archive.zip")).toBe(true);
    // Should not include images, docs, audio, or videos
    expect(data.files.some((f) => f.filename === "photo.png")).toBe(false);
    expect(data.files.some((f) => f.filename === "doc.pdf")).toBe(false);
    expect(data.files.some((f) => f.filename === "song.mp3")).toBe(false);
  });

  test("private channel files excluded for non-member", async () => {
    const uid = testId();

    // Create a private channel and upload a file
    const privRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `fb-priv-${uid}`, type: "private" },
    });
    expect(privRes.status).toBe(201);
    const privChan = (await privRes.json()) as { id: string };

    await uploadAndLink(
      headers,
      slug,
      privChan.id,
      makeTestFile("secret.txt", "secret", "text/plain"),
      "secret file",
    );

    // Create a second user and add to workspace but NOT private channel
    const ctx2 = await createTestClient({
      id: `fb-member-${uid}`,
      displayName: "FB Member",
      email: `fb-member-${uid}@openslaq.dev`,
    });
    await addToWorkspace(client, slug, ctx2.client);

    const res = await ctx2.client.api.workspaces[":slug"].files.$get({
      param: { slug },
      query: {},
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as FileBrowserResponse;
    expect(data.files.some((f) => f.filename === "secret.txt")).toBe(false);
  });
});
