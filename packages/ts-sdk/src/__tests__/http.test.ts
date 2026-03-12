import { describe, expect, test } from "bun:test";
import { HttpClient } from "../http";
import { OpenSlaqApiError } from "../errors";

function createMockFetch(response: { status: number; body?: unknown; ok?: boolean }) {
  return (async (url: string, init?: RequestInit) => {
    return {
      ok: response.ok ?? (response.status >= 200 && response.status < 300),
      status: response.status,
      text: async () => (response.body !== undefined ? JSON.stringify(response.body) : ""),
      json: async () => response.body,
      _url: url,
      _init: init,
    };
  }) as unknown as typeof fetch;
}

function createCapturingFetch(response: { status: number; body?: unknown }) {
  let captured: { url: string; init?: RequestInit } | undefined;
  const mockFetch = (async (url: string, init?: RequestInit) => {
    captured = { url, init };
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      text: async () => (response.body !== undefined ? JSON.stringify(response.body) : ""),
      json: async () => response.body,
    };
  }) as unknown as typeof fetch;
  return { mockFetch, getCaptured: () => captured! };
}

describe("HttpClient", () => {
  const baseOptions = {
    apiKey: "osk_test123",
    baseUrl: "http://localhost:3001",
    workspaceSlug: "default",
  };

  test("sends correct Authorization header", async () => {
    const { mockFetch, getCaptured } = createCapturingFetch({ status: 200, body: { ok: true } });
    const client = new HttpClient({ ...baseOptions, fetch: mockFetch });

    await client.get("/api/test");
    const headers = getCaptured().init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer osk_test123");
  });

  test("sends Content-Type header", async () => {
    const { mockFetch, getCaptured } = createCapturingFetch({ status: 200, body: { ok: true } });
    const client = new HttpClient({ ...baseOptions, fetch: mockFetch });

    await client.get("/api/test");
    const headers = getCaptured().init?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  test("builds workspace-scoped URL", () => {
    const client = new HttpClient({ ...baseOptions, fetch: createMockFetch({ status: 200 }) });
    expect(client.workspacePath("/channels/abc/messages")).toBe("/api/workspaces/default/channels/abc/messages");
  });

  test("builds global URL", () => {
    const client = new HttpClient({ ...baseOptions, fetch: createMockFetch({ status: 200 }) });
    expect(client.globalPath("/messages/abc")).toBe("/api/messages/abc");
  });

  test("passes query params as URL search params", async () => {
    const { mockFetch, getCaptured } = createCapturingFetch({ status: 200, body: [] });
    const client = new HttpClient({ ...baseOptions, fetch: mockFetch });

    await client.get("/api/test", { limit: 10, cursor: "abc", empty: undefined });
    const url = new URL(getCaptured().url);
    expect(url.searchParams.get("limit")).toBe("10");
    expect(url.searchParams.get("cursor")).toBe("abc");
    expect(url.searchParams.has("empty")).toBe(false);
  });

  test("throws OpenSlaqApiError on 4xx with parsed error", async () => {
    const client = new HttpClient({
      ...baseOptions,
      fetch: createMockFetch({ status: 404, ok: false, body: { error: "Not found" } }),
    });

    try {
      await client.get("/api/test");
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(OpenSlaqApiError);
      const err = e as OpenSlaqApiError;
      expect(err.status).toBe(404);
      expect(err.errorMessage).toBe("Not found");
    }
  });

  test("throws OpenSlaqApiError on 5xx", async () => {
    const client = new HttpClient({
      ...baseOptions,
      fetch: createMockFetch({ status: 500, ok: false, body: { error: "Internal error" } }),
    });

    try {
      await client.get("/api/test");
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(OpenSlaqApiError);
      expect((e as OpenSlaqApiError).status).toBe(500);
    }
  });

  test("sends JSON body on POST", async () => {
    const { mockFetch, getCaptured } = createCapturingFetch({ status: 201, body: { id: "1" } });
    const client = new HttpClient({ ...baseOptions, fetch: mockFetch });

    await client.post("/api/test", { content: "hello" });
    expect(getCaptured().init?.method).toBe("POST");
    expect(getCaptured().init?.body).toBe(JSON.stringify({ content: "hello" }));
  });

  test("sends JSON body on PUT", async () => {
    const { mockFetch, getCaptured } = createCapturingFetch({ status: 200, body: { id: "1" } });
    const client = new HttpClient({ ...baseOptions, fetch: mockFetch });

    await client.put("/api/test", { content: "updated" });
    expect(getCaptured().init?.method).toBe("PUT");
    expect(getCaptured().init?.body).toBe(JSON.stringify({ content: "updated" }));
  });

  test("del sends DELETE method", async () => {
    const { mockFetch, getCaptured } = createCapturingFetch({ status: 200, body: { ok: true } });
    const client = new HttpClient({ ...baseOptions, fetch: mockFetch });

    await client.del("/api/test");
    expect(getCaptured().init?.method).toBe("DELETE");
  });

  test("postFormData skips Content-Type header", async () => {
    const { mockFetch, getCaptured } = createCapturingFetch({ status: 200, body: { ok: true } });
    const client = new HttpClient({ ...baseOptions, fetch: mockFetch });

    const formData = new FormData();
    formData.append("file", new File(["test"], "test.txt"));
    await client.postFormData("/api/test", formData);

    const headers = getCaptured().init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer osk_test123");
    expect(headers["Content-Type"]).toBeUndefined();
    expect(getCaptured().init?.body).toBeInstanceOf(FormData);
  });

  test("getRedirectUrl returns Location header", async () => {
    const mockFetch = (async (_url: string, _init?: RequestInit) => {
      return {
        ok: false,
        status: 302,
        headers: new Headers({ Location: "https://cdn.example.com/file.png" }),
      };
    }) as unknown as typeof fetch;
    const client = new HttpClient({ ...baseOptions, fetch: mockFetch });

    const location = await client.getRedirectUrl("/api/uploads/att-1/download");
    expect(location).toBe("https://cdn.example.com/file.png");
  });

  test("getRedirectUrl throws on missing Location header", async () => {
    const mockFetch = (async (_url: string, _init?: RequestInit) => {
      return {
        ok: false,
        status: 302,
        headers: new Headers(),
      };
    }) as unknown as typeof fetch;
    const client = new HttpClient({ ...baseOptions, fetch: mockFetch });

    try {
      await client.getRedirectUrl("/api/uploads/att-1/download");
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(OpenSlaqApiError);
      expect((e as OpenSlaqApiError).errorMessage).toContain("Missing Location header");
    }
  });

  test("strips trailing slashes from baseUrl", async () => {
    const { mockFetch, getCaptured } = createCapturingFetch({ status: 200, body: {} });
    const client = new HttpClient({ ...baseOptions, baseUrl: "http://localhost:3001///", fetch: mockFetch });

    await client.get("/api/test");
    expect(getCaptured().url).toStartWith("http://localhost:3001/api/test");
  });
});
