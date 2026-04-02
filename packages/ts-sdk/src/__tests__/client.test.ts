import { describe, expect, test } from "bun:test";
import { OpenSlaq, OpenSlaqError } from "../index";

describe("OpenSlaq client", () => {
  const mockFetch = (() => {}) as unknown as typeof fetch;

  test("throws on missing API key", () => {
    expect(() => new OpenSlaq({ apiKey: "", workspaceSlug: "test", fetch: mockFetch })).toThrow(OpenSlaqError);
  });

  test("throws on invalid API key prefix", () => {
    expect(() => new OpenSlaq({ apiKey: "sk_abc123", workspaceSlug: "test", fetch: mockFetch })).toThrow("must start with 'osk_'");
  });

  test("throws on missing workspaceSlug", () => {
    expect(() => new OpenSlaq({ apiKey: "osk_test123", workspaceSlug: "", fetch: mockFetch })).toThrow("workspaceSlug is required");
  });

  test("accepts valid osk_ key", () => {
    const client = new OpenSlaq({ apiKey: "osk_test123", workspaceSlug: "test", fetch: mockFetch });
    expect(client).toBeDefined();
    expect(client.messages).toBeDefined();
  });

  test("accepts custom baseUrl and workspaceSlug", () => {
    const client = new OpenSlaq({
      apiKey: "osk_test123",
      baseUrl: "http://localhost:3001",
      workspaceSlug: "my-workspace",
      fetch: mockFetch,
    });
    expect(client).toBeDefined();
  });

  test("exposes dms, files, and search resources", () => {
    const client = new OpenSlaq({ apiKey: "osk_test123", workspaceSlug: "test", fetch: mockFetch });
    expect(client.dms).toBeDefined();
    expect(client.files).toBeDefined();
    expect(client.search).toBeDefined();
  });
});
