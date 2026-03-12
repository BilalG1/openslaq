import { describe, expect, test } from "bun:test";
import { OpenSlaqApiError } from "../index";
import type { BrowseFilesResponse, UploadResponse } from "../types";
import { createClient } from "./test-utils";

const fakeUploadResponse: UploadResponse = {
  attachments: [
    {
      id: "att-1",
      messageId: null,
      filename: "test.png",
      mimeType: "image/png",
      size: 1024,
      uploadedBy: "user-1",
      createdAt: "2026-01-01T00:00:00Z",
      downloadUrl: "http://localhost:3001/uploads/att-1/download",
    },
  ],
};

const fakeBrowseResponse: BrowseFilesResponse = {
  files: [
    {
      id: "att-1",
      filename: "test.png",
      mimeType: "image/png",
      size: 1024,
      category: "images",
      downloadUrl: "http://localhost:3001/uploads/att-1/download",
      uploadedBy: "user-1",
      uploaderName: "Alice",
      channelId: "ch-1",
      channelName: "general",
      messageId: "msg-1",
      createdAt: "2026-01-01T00:00:00Z",
    },
  ],
  nextCursor: null,
};

describe("Files resource", () => {
  test("upload() POSTs FormData with single file", async () => {
    let capturedBody: unknown;
    let capturedHeaders: Record<string, string> | undefined;
    const client = createClient((_url, init) => {
      capturedBody = init?.body;
      capturedHeaders = init?.headers as Record<string, string>;
      return { status: 200, body: fakeUploadResponse };
    });

    const file = new File(["hello"], "test.txt", { type: "text/plain" });
    const result = await client.files.upload({ files: file });

    expect(capturedBody).toBeInstanceOf(FormData);
    const fd = capturedBody as FormData;
    expect(fd.getAll("files")).toHaveLength(1);
    expect(capturedHeaders?.["Content-Type"]).toBeUndefined();
    expect(result.attachments).toHaveLength(1);
    expect(result.attachments[0]!.id).toBe("att-1");
  });

  test("upload() POSTs FormData with multiple files", async () => {
    let capturedBody: unknown;
    const client = createClient((_url, init) => {
      capturedBody = init?.body;
      return { status: 200, body: fakeUploadResponse };
    });

    const files = [
      new File(["a"], "a.txt", { type: "text/plain" }),
      new File(["b"], "b.txt", { type: "text/plain" }),
    ];
    await client.files.upload({ files });

    const fd = capturedBody as FormData;
    expect(fd.getAll("files")).toHaveLength(2);
  });

  test("getDownloadUrl() returns Location header from redirect", async () => {
    const client = createClient(() => ({
      status: 302,
      body: undefined,
      headers: { Location: "https://cdn.example.com/file.png" },
    }));

    const url = await client.files.getDownloadUrl("att-1");
    expect(url).toBe("https://cdn.example.com/file.png");
  });

  test("getDownloadUrl() throws on missing Location header", async () => {
    const client = createClient(() => ({
      status: 302,
      body: undefined,
      headers: {},
    }));

    try {
      await client.files.getDownloadUrl("att-1");
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(OpenSlaqApiError);
      expect((e as OpenSlaqApiError).errorMessage).toContain("Missing Location header");
    }
  });

  test("browse() GETs /files with options", async () => {
    let capturedUrl = "";
    const client = createClient((url) => {
      capturedUrl = url;
      return { status: 200, body: fakeBrowseResponse };
    });

    const result = await client.files.browse({ category: "images", limit: 10 });
    const url = new URL(capturedUrl);
    expect(url.pathname).toBe("/api/workspaces/test-ws/files");
    expect(url.searchParams.get("category")).toBe("images");
    expect(url.searchParams.get("limit")).toBe("10");
    expect(result.files).toHaveLength(1);
  });

  test("browse() works without options", async () => {
    const client = createClient(() => ({ status: 200, body: fakeBrowseResponse }));
    const result = await client.files.browse();
    expect(result.files).toHaveLength(1);
  });
});
