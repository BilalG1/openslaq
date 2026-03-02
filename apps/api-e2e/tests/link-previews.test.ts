import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { createTestClient, createTestWorkspace, testId } from "./helpers/api-client";
import {
  extractUrls,
  isPrivateUrl,
  parseHtmlMeta,
  fetchPreview,
} from "../../api/src/messages/link-preview-service";
import { db } from "../../api/src/db";
import { linkPreviews } from "../../api/src/messages/link-preview-schema";
import { eq } from "drizzle-orm";

type MessageWithPreviews = {
  id: string;
  linkPreviews?: Array<{
    url: string;
    title: string | null;
    description: string | null;
    siteName: string | null;
    faviconUrl: string | null;
    imageUrl: string | null;
  }>;
};

/** Poll for link previews to appear on a message, with short intervals. */
async function waitForPreviews(
  client: Awaited<ReturnType<typeof createTestClient>>["client"],
  messageId: string,
  maxAttempts = 15,
  intervalMs = 500,
): Promise<MessageWithPreviews> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await client.api.messages[":id"].$get({ param: { id: messageId } });
    const msg = (await res.json()) as MessageWithPreviews;
    if (msg.linkPreviews && msg.linkPreviews.length > 0) return msg;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  const res = await client.api.messages[":id"].$get({ param: { id: messageId } });
  return (await res.json()) as MessageWithPreviews;
}

// ---------------------------------------------------------------------------
// extractUrls
// ---------------------------------------------------------------------------

describe("extractUrls", () => {
  test("single URL", () => {
    expect(extractUrls("Check out https://example.com")).toEqual(["https://example.com"]);
  });

  test("multiple URLs", () => {
    expect(extractUrls("https://a.com and https://b.com")).toEqual(["https://a.com", "https://b.com"]);
  });

  test("deduplicates", () => {
    expect(extractUrls("https://a.com https://a.com")).toEqual(["https://a.com"]);
  });

  test("limits to 3", () => {
    expect(extractUrls("https://a.com https://b.com https://c.com https://d.com")).toHaveLength(3);
  });

  test("no URLs → empty", () => {
    expect(extractUrls("plain text")).toEqual([]);
  });

  test("empty string → empty", () => {
    expect(extractUrls("")).toEqual([]);
  });

  test("strips trailing punctuation", () => {
    expect(extractUrls("https://x.com.")).toEqual(["https://x.com"]);
    expect(extractUrls("https://x.com,")).toEqual(["https://x.com"]);
    expect(extractUrls("https://x.com!")).toEqual(["https://x.com"]);
    expect(extractUrls("https://x.com;")).toEqual(["https://x.com"]);
    expect(extractUrls("(https://x.com)")).toEqual(["https://x.com"]);
  });

  test("http:// and paths", () => {
    expect(extractUrls("http://x.com/p?q=1")).toEqual(["http://x.com/p?q=1"]);
  });
});

// ---------------------------------------------------------------------------
// isPrivateUrl (SSRF protection)
// ---------------------------------------------------------------------------

describe("isPrivateUrl", () => {
  test("blocks private ranges", () => {
    expect(isPrivateUrl("http://10.0.0.1/p")).toBe(true);
    expect(isPrivateUrl("http://10.255.255.255")).toBe(true);
    expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
    expect(isPrivateUrl("http://172.31.255.255")).toBe(true);
    expect(isPrivateUrl("http://192.168.1.1")).toBe(true);
    expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://127.0.0.1:3001/api")).toBe(true);
    expect(isPrivateUrl("http://0.0.0.0")).toBe(true);
    expect(isPrivateUrl("http://localhost")).toBe(true);
    expect(isPrivateUrl("http://localhost:8080")).toBe(true);
    expect(isPrivateUrl("http://[::1]")).toBe(true);
  });

  test("allows public addresses", () => {
    expect(isPrivateUrl("https://93.184.216.34")).toBe(false);
    expect(isPrivateUrl("https://github.com")).toBe(false);
    expect(isPrivateUrl("https://1.1.1.1")).toBe(false);
  });

  test("rejects garbage input", () => {
    expect(isPrivateUrl("not-a-url")).toBe(true);
    expect(isPrivateUrl("")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// parseHtmlMeta
// ---------------------------------------------------------------------------

describe("parseHtmlMeta", () => {
  test("extracts OG tags", () => {
    const m = parseHtmlMeta(`<head>
      <meta property="og:title" content="T">
      <meta property="og:description" content="D">
      <meta property="og:image" content="https://x.com/i.jpg">
      <meta property="og:site_name" content="S">
    </head>`);
    expect(m.ogTitle).toBe("T");
    expect(m.ogDescription).toBe("D");
    expect(m.ogImage).toBe("https://x.com/i.jpg");
    expect(m.ogSiteName).toBe("S");
  });

  test("falls back to <title>", () => {
    const m = parseHtmlMeta("<title>Fallback</title>");
    expect(m.title).toBe("Fallback");
    expect(m.ogTitle).toBeNull();
  });

  test("falls back to meta description", () => {
    const m = parseHtmlMeta('<meta name="description" content="Desc">');
    expect(m.ogDescription).toBe("Desc");
  });

  test("og:description wins over meta description", () => {
    const m = parseHtmlMeta(`
      <meta name="description" content="Lose">
      <meta property="og:description" content="Win">`);
    expect(m.ogDescription).toBe("Win");
  });

  test("extracts favicon", () => {
    expect(parseHtmlMeta('<link rel="icon" href="/f.ico">').favicon).toBe("/f.ico");
    expect(parseHtmlMeta('<link rel="shortcut icon" href="/s.ico">').favicon).toBe("/s.ico");
  });

  test("empty HTML → all null", () => {
    const m = parseHtmlMeta("");
    expect(m.ogTitle).toBeNull();
    expect(m.ogDescription).toBeNull();
    expect(m.ogImage).toBeNull();
    expect(m.ogSiteName).toBeNull();
    expect(m.title).toBeNull();
    expect(m.favicon).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// fetchPreview (local HTTP server + fetch mock to bypass SSRF)
// ---------------------------------------------------------------------------

describe("fetchPreview", () => {
  const originalFetch = globalThis.fetch;
  let server: ReturnType<typeof Bun.serve>;
  const TEST_DOMAIN = "https://test-linkpreview.example.com";

  const pages: Record<string, { status: number; headers: Record<string, string>; body: string }> = {
    "/og": {
      status: 200,
      headers: { "content-type": "text/html" },
      body: `<head>
        <meta property="og:title" content="OG Title">
        <meta property="og:description" content="OG Desc">
        <meta property="og:image" content="https://cdn.example.com/hero.jpg">
        <meta property="og:site_name" content="MySite">
        <link rel="icon" href="/fav.ico">
      </head>`,
    },
    "/title-only": {
      status: 200,
      headers: { "content-type": "text/html" },
      body: "<title>Plain Title</title>",
    },
    "/no-title": {
      status: 200,
      headers: { "content-type": "text/html" },
      body: "<body>nothing</body>",
    },
    "/404": { status: 404, headers: { "content-type": "text/html" }, body: "" },
    "/json": { status: 200, headers: { "content-type": "application/json" }, body: "{}" },
    "/relative": {
      status: 200,
      headers: { "content-type": "text/html" },
      body: `<head><title>Rel</title>
        <meta property="og:image" content="/img/hero.png">
        <link rel="icon" href="/fav.png">
      </head>`,
    },
    "/absolute": {
      status: 200,
      headers: { "content-type": "text/html" },
      body: `<head><title>Abs</title>
        <meta property="og:image" content="https://cdn.example.com/hero.png">
        <link rel="icon" href="https://cdn.example.com/fav.png">
      </head>`,
    },
  };

  server = Bun.serve({
    port: 0,
    fetch(req) {
      const route = pages[new URL(req.url).pathname];
      if (!route) return new Response("", { status: 404 });
      return new Response(route.body, { status: route.status, headers: route.headers });
    },
  });

  // Redirect TEST_DOMAIN → local server so fetchPreview's SSRF check passes
  const patched = (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith(TEST_DOMAIN)) {
      return originalFetch(`http://127.0.0.1:${server.port}${url.slice(TEST_DOMAIN.length)}`, init);
    }
    return originalFetch(input, init);
  };
  globalThis.fetch = Object.assign(patched, { preconnect: originalFetch.preconnect }) as typeof fetch;

  afterAll(() => {
    server.stop();
    globalThis.fetch = originalFetch;
  });

  // SSRF blocking
  test("blocks private IPs", async () => {
    for (const host of ["127.0.0.1:9999", "localhost:9999", "10.0.0.1", "192.168.1.1"]) {
      const r = await fetchPreview(`http://${host}/x`);
      expect(r.fetchError).toBe("private IP blocked");
    }
  });

  test("returns error for unreachable host", async () => {
    const r = await fetchPreview("https://no-such-domain-12345.invalid");
    expect(r.fetchError).toBeTruthy();
    expect(r.fetchedAt).toBeInstanceOf(Date);
  });

  // Full fetch → parse pipeline
  test("extracts full OG metadata", async () => {
    const r = await fetchPreview(`${TEST_DOMAIN}/og`);
    expect(r.fetchError).toBeUndefined();
    expect(r.title).toBe("OG Title");
    expect(r.description).toBe("OG Desc");
    expect(r.imageUrl).toBe("https://cdn.example.com/hero.jpg");
    expect(r.siteName).toBe("MySite");
    expect(r.faviconUrl).toContain("/fav.ico");
  });

  test("falls back to <title>", async () => {
    const r = await fetchPreview(`${TEST_DOMAIN}/title-only`);
    expect(r.fetchError).toBeUndefined();
    expect(r.title).toBe("Plain Title");
    expect(r.faviconUrl).toBe(`${TEST_DOMAIN}/favicon.ico`);
  });

  test("no title → error", async () => {
    expect((await fetchPreview(`${TEST_DOMAIN}/no-title`)).fetchError).toBe("no title");
  });

  test("non-200 → error", async () => {
    expect((await fetchPreview(`${TEST_DOMAIN}/404`)).fetchError).toBe("HTTP 404");
  });

  test("non-HTML content type → error", async () => {
    expect((await fetchPreview(`${TEST_DOMAIN}/json`)).fetchError).toBe("not HTML");
  });

  test("resolves relative URLs", async () => {
    const r = await fetchPreview(`${TEST_DOMAIN}/relative`);
    expect(r.imageUrl).toBe(`${TEST_DOMAIN}/img/hero.png`);
    expect(r.faviconUrl).toBe(`${TEST_DOMAIN}/fav.png`);
  });

  test("preserves absolute URLs", async () => {
    const r = await fetchPreview(`${TEST_DOMAIN}/absolute`);
    expect(r.imageUrl).toBe("https://cdn.example.com/hero.png");
    expect(r.faviconUrl).toBe("https://cdn.example.com/fav.png");
  });
});

// ---------------------------------------------------------------------------
// End-to-end: HTTP API
// ---------------------------------------------------------------------------

describe("link previews e2e", () => {
  let client: Awaited<ReturnType<typeof createTestClient>>["client"];
  let slug: string;
  let channelId: string;

  beforeAll(async () => {
    const ctx = await createTestClient();
    client = ctx.client;
    const ws = await createTestWorkspace(client);
    slug = ws.slug;

    const chRes = await client.api.workspaces[":slug"].channels.$post({
      param: { slug },
      json: { name: `lp-${testId()}` },
    });
    channelId = ((await chRes.json()) as { id: string }).id;
  });

  test("message with URL gets link previews after unfurl", async () => {
    const msgRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: "Check out https://github.com" },
    });
    expect(msgRes.status).toBe(201);
    const msg = (await msgRes.json()) as { id: string };

    const fetched = await waitForPreviews(client, msg.id);
    expect(fetched.linkPreviews).toBeDefined();
    expect(fetched.linkPreviews!.length).toBe(1);
    expect(fetched.linkPreviews![0]!.url).toBe("https://github.com");
    expect(fetched.linkPreviews![0]!.title).toBeTruthy();
  }, 15000);

  test("message without URL has no link previews", async () => {
    const msgRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: "Hello, no links here" },
    });
    expect(msgRes.status).toBe(201);
    const msg = (await msgRes.json()) as { id: string };

    await new Promise((r) => setTimeout(r, 500));
    const res = await client.api.messages[":id"].$get({ param: { id: msg.id } });
    expect(((await res.json()) as MessageWithPreviews).linkPreviews).toBeUndefined();
  });

  test("link previews appear in message list endpoint", async () => {
    const msgRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: "List test https://github.com" },
    });
    expect(msgRes.status).toBe(201);
    const msg = (await msgRes.json()) as { id: string };

    await waitForPreviews(client, msg.id);

    const listRes = await client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug, id: channelId },
      query: {},
    });
    expect(listRes.status).toBe(200);
    const data = (await listRes.json()) as { messages: MessageWithPreviews[] };
    const target = data.messages.find((m) => m.id === msg.id);
    expect(target?.linkPreviews?.length).toBeGreaterThan(0);
  }, 15000);

  test("editing message re-unfurls links", async () => {
    const msgRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: "No link yet" },
    });
    expect(msgRes.status).toBe(201);
    const msg = (await msgRes.json()) as { id: string };

    await client.api.messages[":id"].$put({
      param: { id: msg.id },
      json: { content: "Now with https://github.com" },
    });

    const fetched = await waitForPreviews(client, msg.id);
    expect(fetched.linkPreviews?.length).toBeGreaterThan(0);
  }, 15000);

  test("message with multiple URLs → previews sorted by position", async () => {
    const msgRes = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: "First https://github.com then https://example.com" },
    });
    expect(msgRes.status).toBe(201);
    const msg = (await msgRes.json()) as { id: string };

    // Wait for at least 2 previews
    let fetched: MessageWithPreviews = { id: msg.id };
    for (let i = 0; i < 20; i++) {
      const res = await client.api.messages[":id"].$get({ param: { id: msg.id } });
      fetched = (await res.json()) as MessageWithPreviews;
      if (fetched.linkPreviews && fetched.linkPreviews.length >= 2) break;
      await new Promise((r) => setTimeout(r, 500));
    }

    expect(fetched.linkPreviews).toBeDefined();
    expect(fetched.linkPreviews!.length).toBeGreaterThanOrEqual(2);

    // Verify order: github.com appears first in the content, so it should be position 0
    const urls = fetched.linkPreviews!.map((p) => p.url);
    expect(urls[0]).toBe("https://github.com");
    expect(urls[1]).toBe("https://example.com");
  }, 20000);

  test("stale cache entry triggers re-fetch", async () => {
    // First, send a message to populate the cache for a URL
    const url = "https://github.com";
    const msg1Res = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `Cache test ${url}` },
    });
    expect(msg1Res.status).toBe(201);
    const msg1 = (await msg1Res.json()) as { id: string };
    await waitForPreviews(client, msg1.id);

    // Backdate the cache entry to 8 days ago (beyond 7-day TTL)
    const staleDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    await db
      .update(linkPreviews)
      .set({ fetchedAt: staleDate })
      .where(eq(linkPreviews.url, url));

    // Send another message with the same URL → should re-fetch (stale cache)
    const msg2Res = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug, id: channelId },
      json: { content: `Stale cache test ${url}` },
    });
    expect(msg2Res.status).toBe(201);
    const msg2 = (await msg2Res.json()) as { id: string };
    await waitForPreviews(client, msg2.id);

    // Verify the cache was updated (fetchedAt should be recent now)
    const cached = await db.query.linkPreviews.findFirst({
      where: eq(linkPreviews.url, url),
    });
    expect(cached).toBeDefined();
    const age = Date.now() - cached!.fetchedAt.getTime();
    expect(age).toBeLessThan(60_000); // Should be very recent
  }, 20000);
});
