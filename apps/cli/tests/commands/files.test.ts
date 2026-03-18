import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  createTestClient,
  createTestWorkspace,
  cleanupTestWorkspaces,
  testId,
  getBaseUrl,
} from "../helpers/api-client";
import { hc } from "hono/client";
import type { AppType } from "@openslaq/api/app";

type Client = ReturnType<typeof hc<AppType>>;

describe("files command (integration)", () => {
  let client: Client;
  let headers: Record<string, string>;
  let slug: string;
  let channelId: string;
  const userId = `cli-files-${testId()}`;

  beforeAll(async () => {
    const ctx = await createTestClient({
      id: userId,
      displayName: "Files Test User",
      email: `${userId}@openslaq.dev`,
    });
    client = ctx.client;
    headers = ctx.headers;
    const workspace = await createTestWorkspace(client);
    slug = workspace.slug;

    // Get #general channel
    const listRes = await client.api.workspaces[":slug"].channels.$get({
      param: { slug },
    });
    const channels = (await listRes.json()) as { id: string; name: string }[];
    const general = channels.find((c) => c.name === "general");
    if (!general) throw new Error("No #general channel found");
    channelId = general.id;

    // Upload a file and send a message with it
    const uploadRes = await client.api.uploads.$post({
      form: { files: new File(["test file content"], "test-file.txt", { type: "text/plain" }) },
    } as any);
    if (uploadRes.ok) {
      const uploaded = (await uploadRes.json()) as { attachments: { id: string }[] };
      if (uploaded.attachments.length > 0) {
        await client.api.workspaces[":slug"].channels[":id"].messages.$post({
          param: { slug, id: channelId },
          json: {
            content: `File test ${testId()}`,
            attachmentIds: [uploaded.attachments[0]!.id],
          },
        });
      }
    }
  });

  afterAll(async () => {
    await cleanupTestWorkspaces();
  });

  test("GET /files returns 200 with files array", async () => {
    const res = await client.api.workspaces[":slug"].files.$get({
      param: { slug },
      query: {},
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { files: unknown[]; nextCursor: string | null };
    expect(Array.isArray(data.files)).toBe(true);
    expect(data).toHaveProperty("nextCursor");
  });

  test("filter by channelId works", async () => {
    const res = await client.api.workspaces[":slug"].files.$get({
      param: { slug },
      query: { channelId },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { files: { channelId: string }[] };
    for (const file of data.files) {
      expect(file.channelId).toBe(channelId);
    }
  });

  test("filter by category works", async () => {
    const res = await client.api.workspaces[":slug"].files.$get({
      param: { slug },
      query: { category: "images" },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { files: { category: string }[] };
    for (const file of data.files) {
      expect(file.category).toBe("images");
    }
  });

  test("download-url returns redirect for uploaded file", async () => {
    // Upload a small file directly via fetch
    const formData = new FormData();
    const blob = new Blob(["download url test"], { type: "text/plain" });
    formData.append("files", blob, "download-test.txt");

    const uploadRes = await fetch(`${getBaseUrl()}/api/uploads`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (uploadRes.status !== 201) {
      // Skip if upload isn't available (e.g. no S3 in test env)
      return;
    }

    const attachments = (await uploadRes.json()) as { attachments: { id: string }[] };
    const attachmentId = attachments.attachments[0]?.id;
    if (!attachmentId) return;

    const downloadRes = await fetch(
      `${getBaseUrl()}/api/uploads/${attachmentId}/download`,
      { headers, redirect: "manual" },
    );
    // Should be 302 redirect to pre-signed URL
    expect([200, 302]).toContain(downloadRes.status);
  });
});
