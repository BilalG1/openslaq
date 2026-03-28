import { OpenSlaq } from "../index";

export interface MockHandlerResult {
  status: number;
  body?: unknown;
  ok?: boolean;
  headers?: Record<string, string>;
}

export type MockHandler = (url: string, init?: RequestInit) => MockHandlerResult;

export function createClient(handler: MockHandler): OpenSlaq {
  const mockFetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const urlStr = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
    const result = handler(urlStr, init);
    return new Response(
      result.body !== undefined ? JSON.stringify(result.body) : null,
      {
        status: result.status,
        headers: {
          "Content-Type": "application/json",
          ...result.headers,
        },
      },
    );
  }) as typeof fetch;

  return new OpenSlaq({
    apiKey: "osk_test123",
    baseUrl: "http://localhost:3001",
    workspaceSlug: "test-ws",
    fetch: mockFetch,
  });
}
