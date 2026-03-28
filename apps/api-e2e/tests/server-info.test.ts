import { describe, test, expect } from "bun:test";
import { getBaseUrl } from "./helpers/api-client";

describe("server-info", () => {
  test("GET /api/server-info returns server info with auth config", async () => {
    const res = await fetch(`${getBaseUrl()}/api/server-info`);
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      name: string;
      version: string;
      auth: { type: string };
    };

    expect(body.name).toBeDefined();
    expect(body.version).toBeDefined();
    expect(body.auth).toBeDefined();
    expect(body.auth.type).toBeOneOf(["stack-auth", "builtin"]);
  });

  test("GET /api/server-info does not require authentication", async () => {
    // No Authorization header
    const res = await fetch(`${getBaseUrl()}/api/server-info`);
    expect(res.status).toBe(200);
  });

  test("GET /api/server-info returns correct shape for stack-auth mode", async () => {
    const res = await fetch(`${getBaseUrl()}/api/server-info`);
    const body = (await res.json()) as Record<string, unknown>;

    // In dev, the default AUTH_MODE is stack-auth
    if ((body.auth as Record<string, unknown>).type === "stack-auth") {
      const auth = body.auth as {
        type: string;
        stackProjectId: string;
        stackPublishableKey: string;
      };
      expect(auth.stackProjectId).toBeDefined();
      expect(typeof auth.stackProjectId).toBe("string");
      expect(auth.stackPublishableKey).toBeDefined();
    }
  });
});
