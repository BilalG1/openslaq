import { OpenSlaq } from "../index";

export interface MockHandlerResult {
  status: number;
  body?: unknown;
  ok?: boolean;
  headers?: Record<string, string>;
}

export type MockHandler = (url: string, init?: RequestInit) => MockHandlerResult;

export function createClient(handler: MockHandler): OpenSlaq {
  const mockFetch = (async (url: string, init?: RequestInit) => {
    const result = handler(url, init);
    return {
      ok: result.ok ?? (result.status >= 200 && result.status < 300),
      status: result.status,
      text: async () => (result.body !== undefined ? JSON.stringify(result.body) : ""),
      json: async () => result.body,
      headers: new Headers(result.headers ?? {}),
    };
  }) as unknown as typeof fetch;

  return new OpenSlaq({
    apiKey: "osk_test123",
    baseUrl: "http://localhost:3001",
    workspaceSlug: "test-ws",
    fetch: mockFetch,
  });
}
