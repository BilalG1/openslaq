import { describe, test, expect, beforeAll } from "bun:test";
import { createHmac } from "node:crypto";
import { createTestClient, createTestWorkspace, addToWorkspace, testId, getBaseUrl } from "./helpers/api-client";

function signPayload(body: string, secret: string): string {
  return createHmac("sha1", secret).update(body).digest("hex");
}

describe("Vercel Bot", () => {
  let adminClient: Awaited<ReturnType<typeof createTestClient>>["client"];
  let superAdminClient: Awaited<ReturnType<typeof createTestClient>>["client"];
  let workspaceSlug: string;
  let workspaceId: string;
  let channelId: string;
  let vercelListingId: string;

  beforeAll(async () => {
    const admin = await createTestClient({
      id: `vercel-admin-${testId()}`,
      displayName: "Vercel Admin",
      email: `vercel-admin-${testId()}@openslaq.dev`,
      emailVerified: true,
    });
    adminClient = admin.client;
    const ws = await createTestWorkspace(adminClient);
    workspaceSlug = ws.slug;
    workspaceId = ws.id;

    // Create super-admin client using the configured admin user ID
    const superAdmin = await createTestClient({
      id: process.env.ADMIN_USER_IDS?.split(",")[0] || "admin-user",
      displayName: "Super Admin",
      email: `super-admin-${testId()}@openslaq.dev`,
      emailVerified: true,
    });
    superAdminClient = superAdmin.client;

    // Get general channel
    const chRes = await adminClient.api.workspaces[":slug"].channels.$get({
      param: { slug: workspaceSlug },
    });
    const channels = (await chRes.json()) as Array<{ id: string; name: string }>;
    channelId = channels.find((c: { id: string; name: string }) => c.name === "general")?.id ?? "";
    expect(channelId).toBeTruthy();

    // Get vercel-bot listing ID
    const listRes = await adminClient.api.marketplace.$get({});
    const listings = (await listRes.json()) as Array<{ id: string; slug: string }>;
    const vercelListing = listings.find((l) => l.slug === "vercel-bot");
    expect(vercelListing).toBeDefined();
    vercelListingId = vercelListing!.id;

    // Enable Vercel integration feature flag
    await superAdminClient.api.admin.workspaces[":workspaceId"]["feature-flags"].$patch({
      param: { workspaceId },
      json: { integrationVercel: true },
    });
  });

  test("install vercel-bot from marketplace", async () => {
    const res = await adminClient.api.workspaces[":slug"].marketplace.install.$post({
      param: { slug: workspaceSlug },
      json: { listingId: vercelListingId },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);

    // Verify it's now installed
    const installedRes = await adminClient.api.workspaces[":slug"].marketplace.installed.$get({
      param: { slug: workspaceSlug },
    });
    expect(installedRes.status).toBe(200);
    const installed = (await installedRes.json()) as { installedListingIds: string[] };
    expect(installed.installedListingIds).toContain(vercelListingId);
  });

  test("/vercel with no args returns usage", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "vercel", args: "", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages).toHaveLength(1);
    expect(result.ephemeralMessages[0]!.text).toContain("Vercel Bot Commands");
  });

  test("/vercel subscribe creates subscription", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "vercel", args: "subscribe my-app", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0]!.text).toContain("Subscribed to **my-app**");
  });

  test("/vercel subscribe with specific events", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "vercel", args: "subscribe api-service deployments,alerts", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0]!.text).toContain("deployments, alerts");
  });

  test("/vercel subscribe with invalid events returns error", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "vercel", args: "subscribe backend bogus,invalid", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0]!.text).toContain("Unknown events");
  });

  test("/vercel subscribe without project name returns usage", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "vercel", args: "subscribe", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0]!.text).toContain("Usage:");
  });

  test("/vercel subscribe rejects duplicate", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "vercel", args: "subscribe my-app", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0]!.text).toContain("Already subscribed");
  });

  test("/vercel list shows subscriptions", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "vercel", args: "list", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0]!.text).toContain("my-app");
    expect(result.ephemeralMessages[0]!.text).toContain("api-service");
  });

  // Test ALL event types via /vercel test to cover event-handlers + message-formatter
  describe("test mode events", () => {
    const testEvents = [
      "deployment_created",
      "deployment_ready",
      "deployment_succeeded",
      "deployment_error",
      "deployment_canceled",
      "deployment_promoted",
      "deployment_rollback",
      "project_created",
      "project_removed",
      "domain_created",
      "alert_triggered",
    ];

    for (const name of testEvents) {
      test(`/vercel test ${name} posts message`, async () => {
        const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
          param: { slug: workspaceSlug },
          json: { command: "vercel", args: `test ${name}`, channelId },
        });
        expect(res.status).toBe(200);
        const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
        expect(result.ok).toBe(true);
        expect(result.ephemeralMessages[0]!.text).toContain(`Test event "${name}" posted`);
      });
    }
  });

  test("/vercel test with no event returns usage", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "vercel", args: "test", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0]!.text).toContain("Usage:");
  });

  test("/vercel test unknown event returns error", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "vercel", args: "test nonexistent", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0]!.text).toContain("Unknown test event");
  });

  test("/vercel unknown subcommand returns usage", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "vercel", args: "foobar", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0]!.text).toContain("Vercel Bot Commands");
  });

  test("/vercel unsubscribe without project name returns usage", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "vercel", args: "unsubscribe", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0]!.text).toContain("Usage:");
  });

  test("/vercel unsubscribe removes subscription", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "vercel", args: "unsubscribe my-app", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0]!.text).toContain("Unsubscribed from **my-app**");
  });

  test("/vercel unsubscribe nonexistent returns not found", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "vercel", args: "unsubscribe nope", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0]!.text).toContain("No subscription");
  });

  test("/vercel list after unsubscribe shows remaining", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "vercel", args: "list", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(true);
    // my-app was unsubscribed, api-service should remain
    expect(result.ephemeralMessages[0]!.text).toContain("api-service");
    expect(result.ephemeralMessages[0]!.text).not.toContain("my-app");
  });

  // Unsubscribe remaining so list returns empty
  test("/vercel list when empty shows help", async () => {
    await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "vercel", args: "unsubscribe api-service", channelId },
    });
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "vercel", args: "list", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0]!.text).toContain("No Vercel subscriptions");
  });

  test("uninstall vercel-bot", async () => {
    const res = await adminClient.api.workspaces[":slug"].marketplace[":listingId"].uninstall.$delete({
      param: { slug: workspaceSlug, listingId: vercelListingId },
    });
    expect(res.status).toBe(200);

    // Verify no longer installed
    const installedRes = await adminClient.api.workspaces[":slug"].marketplace.installed.$get({
      param: { slug: workspaceSlug },
    });
    const installed = (await installedRes.json()) as { installedListingIds: string[] };
    expect(installed.installedListingIds).not.toContain(vercelListingId);
  });

  test("/vercel command without bot installed returns unknown command", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "vercel", args: "subscribe my-app", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Unknown command");
  });

  test("/vercel test without bot installed returns error", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "vercel", args: "test deployment_created", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(false);
  });

  describe("webhook HMAC signature verification", () => {
    const secret = process.env.VERCEL_WEBHOOK_SECRET ?? process.env.VERCEL_CLIENT_SECRET ?? "test-webhook-secret-123";

    test("valid signature returns 200", async () => {
      const body = JSON.stringify({
        type: "deployment.created",
        payload: { deployment: { projectId: "test-project-id" } },
      });
      const res = await fetch(`${getBaseUrl()}/api/integrations/vercel-bot/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vercel-signature": signPayload(body, secret),
        },
        body,
      });
      expect(res.status).toBe(200);
      const json = (await res.json()) as { ok: boolean };
      expect(json.ok).toBe(true);
    });

    test("invalid signature returns 401", async () => {
      const body = JSON.stringify({
        type: "deployment.created",
        payload: {},
      });
      const res = await fetch(`${getBaseUrl()}/api/integrations/vercel-bot/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vercel-signature": signPayload(body, "wrong-secret"),
        },
        body,
      });
      expect(res.status).toBe(401);
    });

    test("missing signature header returns 401", async () => {
      const body = JSON.stringify({
        type: "deployment.created",
        payload: {},
      });
      const res = await fetch(`${getBaseUrl()}/api/integrations/vercel-bot/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body,
      });
      expect(res.status).toBe(401);
    });
  });

  describe("webhook event processing", () => {
    const secret = process.env.VERCEL_WEBHOOK_SECRET ?? process.env.VERCEL_CLIENT_SECRET ?? "test-webhook-secret-123";

    let wsSlug2: string;

    beforeAll(async () => {
      const admin2 = await createTestClient({
        id: `vercel-webhook-admin-${testId()}`,
        displayName: "Vercel Webhook Admin",
        email: `vercel-webhook-admin-${testId()}@openslaq.dev`,
        emailVerified: true,
      });
      const ws2 = await createTestWorkspace(admin2.client);
      wsSlug2 = ws2.slug;

      // Enable feature flag and install vercel-bot
      await superAdminClient.api.admin.workspaces[":workspaceId"]["feature-flags"].$patch({
        param: { workspaceId: ws2.id },
        json: { integrationVercel: true },
      });
      const listRes = await admin2.client.api.marketplace.$get({});
      const listings = (await listRes.json()) as Array<{ id: string; slug: string }>;
      const vercelListing = listings.find((l) => l.slug === "vercel-bot");
      await admin2.client.api.workspaces[":slug"].marketplace.install.$post({
        param: { slug: wsSlug2 },
        json: { listingId: vercelListing!.id },
      });

      // Get channel and subscribe with all events
      const chRes = await admin2.client.api.workspaces[":slug"].channels.$get({
        param: { slug: wsSlug2 },
      });
      const channels = (await chRes.json()) as Array<{ id: string; name: string }>;
      const ch = channels.find((c: { id: string; name: string }) => c.name === "general")!;

      await admin2.client.api.workspaces[":slug"].commands.execute.$post({
        param: { slug: wsSlug2 },
        json: { command: "vercel", args: "subscribe my-app", channelId: ch.id },
      });
    });

    function sendWebhook(payload: Record<string, unknown>) {
      const body = JSON.stringify(payload);
      return fetch(`${getBaseUrl()}/api/integrations/vercel-bot/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vercel-signature": signPayload(body, secret),
        },
        body,
      });
    }

    test("deployment.created event returns 200", async () => {
      const res = await sendWebhook({
        type: "deployment.created",
        payload: {
          name: "my-app",
          deployment: {
            projectId: "my-app",
            url: "my-app-abc123.vercel.app",
            inspectorUrl: "https://vercel.com/acme/my-app/deployments/dpl_abc123",
            creator: { username: "alice" },
            meta: { target: "production" },
          },
        },
      });
      expect(res.status).toBe(200);
    });

    test("deployment.ready event returns 200", async () => {
      const res = await sendWebhook({
        type: "deployment.ready",
        payload: {
          name: "my-app",
          deployment: {
            projectId: "my-app",
            url: "my-app-abc123.vercel.app",
            inspectorUrl: "https://vercel.com/acme/my-app/deployments/dpl_abc123",
            creator: { username: "alice" },
            meta: { target: "production" },
          },
        },
      });
      expect(res.status).toBe(200);
    });

    test("deployment.error event returns 200", async () => {
      const res = await sendWebhook({
        type: "deployment.error",
        payload: {
          name: "my-app",
          deployment: {
            projectId: "my-app",
            url: "my-app-abc123.vercel.app",
            inspectorUrl: "https://vercel.com/acme/my-app/deployments/dpl_abc123",
            creator: { username: "alice" },
            meta: { target: "production" },
          },
        },
      });
      expect(res.status).toBe(200);
    });

    test("unknown event type returns 200 (accepted but ignored)", async () => {
      const res = await sendWebhook({
        type: "unknown.event",
        payload: {
          deployment: { projectId: "my-app" },
        },
      });
      expect(res.status).toBe(200);
    });

    test("event without payload returns 200 (accepted but ignored)", async () => {
      const res = await sendWebhook({
        type: "deployment.created",
      });
      expect(res.status).toBe(200);
    });

    test("event without type returns 200 (accepted but ignored)", async () => {
      const res = await sendWebhook({
        payload: { deployment: { projectId: "my-app" } },
      });
      expect(res.status).toBe(200);
    });

    test("event for unsubscribed project returns 200 (no match)", async () => {
      const res = await sendWebhook({
        type: "deployment.created",
        payload: {
          name: "other-app",
          deployment: {
            projectId: "UNKNOWN-PROJECT-ID",
            url: "other.vercel.app",
            creator: { username: "alice" },
          },
        },
      });
      expect(res.status).toBe(200);
    });
  });

  describe("Vercel connection setup routes", () => {
    let adminHeaders: Record<string, string>;
    let memberHeaders: Record<string, string>;
    let connectWsSlug: string;

    beforeAll(async () => {
      const admin = await createTestClient({
        id: `vercel-connect-admin-${testId()}`,
        displayName: "Vercel Connect Admin",
        email: `vercel-connect-admin-${testId()}@openslaq.dev`,
        emailVerified: true,
      });
      adminHeaders = admin.headers;
      const ws = await createTestWorkspace(admin.client);
      connectWsSlug = ws.slug;

      // Enable feature flag and install vercel-bot from marketplace
      await superAdminClient.api.admin.workspaces[":workspaceId"]["feature-flags"].$patch({
        param: { workspaceId: ws.id },
        json: { integrationVercel: true },
      });
      const listRes = await admin.client.api.marketplace.$get({});
      const listings = (await listRes.json()) as Array<{ id: string; slug: string }>;
      const vercelListing = listings.find((l) => l.slug === "vercel-bot");
      await admin.client.api.workspaces[":slug"].marketplace.install.$post({
        param: { slug: connectWsSlug },
        json: { listingId: vercelListing!.id },
      });

      // Create a non-admin member
      const member = await createTestClient({
        id: `vercel-connect-member-${testId()}`,
        displayName: "Vercel Connect Member",
        email: `vercel-connect-member-${testId()}@openslaq.dev`,
        emailVerified: true,
      });
      memberHeaders = member.headers;
      await addToWorkspace(admin.client, connectWsSlug, member.client);
    });

    function connectionUrl() {
      return `${getBaseUrl()}/api/workspaces/${connectWsSlug}/integrations/vercel-bot/connection`;
    }

    function oauthUrl() {
      return `${getBaseUrl()}/api/workspaces/${connectWsSlug}/integrations/vercel-bot/oauth-url`;
    }

    function connectUrl() {
      return `${getBaseUrl()}/api/workspaces/${connectWsSlug}/integrations/vercel-bot/connect`;
    }

    test("GET connection before connecting returns null", async () => {
      const res = await fetch(connectionUrl(), {
        headers: { ...adminHeaders },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { connection: null };
      expect(body.connection).toBeNull();
    });

    test("GET oauth-url returns installation URL or 503", async () => {
      const res = await fetch(oauthUrl(), {
        headers: { ...adminHeaders },
      });
      // If VERCEL_CLIENT_ID is set, returns 200 with URL
      // If not configured, returns 503
      if (res.status === 200) {
        const body = (await res.json()) as { url: string };
        expect(body.url).toContain("vercel.com/integrations/");
      } else {
        expect(res.status).toBe(503);
      }
    });

    test("POST connect with invalid code returns 400 or 503", async () => {
      const res = await fetch(connectUrl(), {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          code: "invalid-code-that-wont-work",
          configurationId: "fake-config-id",
          teamId: "team_abc",
          teamSlug: "acme",
        }),
      });
      // Should return 400 (failed to exchange) or 503 if not configured
      expect([400, 503]).toContain(res.status);
    });

    test("non-admin POST connect returns 403", async () => {
      const res = await fetch(connectUrl(), {
        method: "POST",
        headers: { ...memberHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          code: "test-code",
          configurationId: "fake-config-id",
          teamId: "team_abc",
          teamSlug: "acme",
        }),
      });
      expect(res.status).toBe(403);
    });

    test("non-admin GET oauth-url returns 403", async () => {
      const res = await fetch(oauthUrl(), {
        headers: { ...memberHeaders },
      });
      expect(res.status).toBe(403);
    });

    test("member can GET connection", async () => {
      const res = await fetch(connectionUrl(), {
        headers: { ...memberHeaders },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { connection: null };
      expect(body.connection).toBeNull();
    });
  });
});
