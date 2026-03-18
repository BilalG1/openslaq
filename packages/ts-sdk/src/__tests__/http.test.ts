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

  test("sends Content-Type header on POST", async () => {
    const { mockFetch, getCaptured } = createCapturingFetch({ status: 200, body: { ok: true } });
    const client = new HttpClient({ ...baseOptions, fetch: mockFetch });

    await client.post("/api/test", { data: "hello" });
    const headers = getCaptured().init?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  test("GET requests do NOT include Content-Type header", async () => {
    const { mockFetch, getCaptured } = createCapturingFetch({ status: 200, body: { ok: true } });
    const client = new HttpClient({ ...baseOptions, fetch: mockFetch });

    await client.get("/api/test");
    const headers = getCaptured().init?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBeUndefined();
  });

  test("DELETE requests do NOT include Content-Type header", async () => {
    const { mockFetch, getCaptured } = createCapturingFetch({ status: 200, body: { ok: true } });
    const client = new HttpClient({ ...baseOptions, fetch: mockFetch });

    await client.del("/api/test");
    const headers = getCaptured().init?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBeUndefined();
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

  test("converts boolean query params to strings", async () => {
    const { mockFetch, getCaptured } = createCapturingFetch({ status: 200, body: [] });
    const client = new HttpClient({ ...baseOptions, fetch: mockFetch });

    await client.get("/api/test", { includeArchived: true, showHidden: false });
    const url = new URL(getCaptured().url);
    expect(url.searchParams.get("includeArchived")).toBe("true");
    expect(url.searchParams.get("showHidden")).toBe("false");
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

  test("patch sends PATCH method with correct body serialization", async () => {
    const { mockFetch, getCaptured } = createCapturingFetch({ status: 200, body: { id: "1", name: "updated" } });
    const client = new HttpClient({ ...baseOptions, fetch: mockFetch });

    const result = await client.patch<{ id: string; name: string }>("/api/test", { name: "updated" });
    expect(getCaptured().init?.method).toBe("PATCH");
    expect(getCaptured().init?.body).toBe(JSON.stringify({ name: "updated" }));
    expect(result).toEqual({ id: "1", name: "updated" });
  });

  test("del sends DELETE method", async () => {
    const { mockFetch, getCaptured } = createCapturingFetch({ status: 200, body: { ok: true } });
    const client = new HttpClient({ ...baseOptions, fetch: mockFetch });

    await client.del("/api/test");
    expect(getCaptured().init?.method).toBe("DELETE");
  });

  test("postVoid does not try to parse response body", async () => {
    const mockFetch = (async (_url: string, _init?: RequestInit) => {
      return {
        ok: true,
        status: 204,
        // Intentionally no text() or json() methods to prove they aren't called
        text: () => { throw new Error("text() should not be called"); },
        json: () => { throw new Error("json() should not be called"); },
      };
    }) as unknown as typeof fetch;
    const client = new HttpClient({ ...baseOptions, fetch: mockFetch });

    // Should complete without error since requestVoid doesn't read the body
    await client.postVoid("/api/test", { data: "hello" });
  });

  test("putVoid does not try to parse response body", async () => {
    const mockFetch = (async (_url: string, _init?: RequestInit) => {
      return {
        ok: true,
        status: 204,
        text: () => { throw new Error("text() should not be called"); },
        json: () => { throw new Error("json() should not be called"); },
      };
    }) as unknown as typeof fetch;
    const client = new HttpClient({ ...baseOptions, fetch: mockFetch });

    await client.putVoid("/api/test", { data: "hello" });
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

  test("postFormData throws OpenSlaqApiError on error response", async () => {
    const client = new HttpClient({
      ...baseOptions,
      fetch: createMockFetch({ status: 413, ok: false, body: { error: "Payload too large" } }),
    });

    const formData = new FormData();
    formData.append("file", new File(["test"], "test.txt"));

    try {
      await client.postFormData("/api/test", formData);
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(OpenSlaqApiError);
      const err = e as OpenSlaqApiError;
      expect(err.status).toBe(413);
      expect(err.errorMessage).toBe("Payload too large");
    }
  });

  test("network-level error propagates without wrapping", async () => {
    const networkError = new TypeError("Network error");
    const mockFetch = (async () => {
      throw networkError;
    }) as unknown as typeof fetch;
    const client = new HttpClient({ ...baseOptions, fetch: mockFetch });

    try {
      await client.get("/api/test");
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBe(networkError);
      expect(e).not.toBeInstanceOf(OpenSlaqApiError);
      expect(e).toBeInstanceOf(TypeError);
    }
  });

  test("empty response body on request() throws OpenSlaqApiError", async () => {
    const mockFetch = (async (_url: string, _init?: RequestInit) => {
      return {
        ok: true,
        status: 200,
        text: async () => "",
        json: async () => ({}),
      };
    }) as unknown as typeof fetch;
    const client = new HttpClient({ ...baseOptions, fetch: mockFetch });

    try {
      await client.get("/api/test");
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(OpenSlaqApiError);
      const err = e as OpenSlaqApiError;
      expect(err.status).toBe(200);
      expect(err.errorMessage).toContain("empty response");
    }
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
