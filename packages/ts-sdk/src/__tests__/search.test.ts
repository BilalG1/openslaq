import { describe, expect, test } from "bun:test";
import type { SearchResponse } from "../types";
import { createClient } from "./test-utils";

const fakeSearchResponse: SearchResponse = {
  results: [
    {
      messageId: "msg-1",
      channelId: "ch-1",
      channelName: "general",
      channelType: "public",
      userId: "user-1",
      userDisplayName: "Alice",
      content: "Hello world",
      headline: "<mark>Hello</mark> world",
      parentMessageId: null,
      createdAt: "2026-01-01T00:00:00Z",
      rank: 0.95,
    },
  ],
  total: 1,
};

describe("Search resource", () => {
  test("query() GETs /search with all params", async () => {
    let capturedUrl = "";
    const client = createClient((url) => {
      capturedUrl = url;
      return { status: 200, body: fakeSearchResponse };
    });

    const result = await client.search.query({
      q: "hello",
      channelId: "ch-1",
      userId: "user-1",
      fromDate: "2026-01-01",
      toDate: "2026-01-31",
      offset: 0,
      limit: 20,
    });

    const url = new URL(capturedUrl);
    expect(url.pathname).toBe("/api/workspaces/test-ws/search");
    expect(url.searchParams.get("q")).toBe("hello");
    expect(url.searchParams.get("channelId")).toBe("ch-1");
    expect(url.searchParams.get("userId")).toBe("user-1");
    expect(url.searchParams.get("fromDate")).toBe("2026-01-01");
    expect(url.searchParams.get("toDate")).toBe("2026-01-31");
    expect(url.searchParams.get("offset")).toBe("0");
    expect(url.searchParams.get("limit")).toBe("20");
    expect(result.results).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  test("query() works with only q param", async () => {
    let capturedUrl = "";
    const client = createClient((url) => {
      capturedUrl = url;
      return { status: 200, body: fakeSearchResponse };
    });

    await client.search.query({ q: "hello" });
    const url = new URL(capturedUrl);
    expect(url.searchParams.get("q")).toBe("hello");
    expect(url.searchParams.has("channelId")).toBe(false);
    expect(url.searchParams.has("userId")).toBe(false);
  });

  test("query() returns typed SearchResponse", async () => {
    const client = createClient(() => ({ status: 200, body: fakeSearchResponse }));
    const result = await client.search.query({ q: "hello" });
    expect(result.results[0]!.headline).toContain("<mark>");
    expect(result.results[0]!.rank).toBe(0.95);
  });
});
