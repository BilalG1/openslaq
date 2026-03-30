import { describe, test, expect, beforeAll } from "bun:test";
import { createHmac } from "node:crypto";
import { createTestClient, createTestWorkspace, addToWorkspace, testId, getBaseUrl } from "./helpers/api-client";

function signPayload(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

describe("Sentry Bot", () => {
  let adminClient: Awaited<ReturnType<typeof createTestClient>>["client"];
  let superAdminClient: Awaited<ReturnType<typeof createTestClient>>["client"];
  let workspaceSlug: string;
  let workspaceId: string;
  let channelId: string;
  let sentryListingId: string;

  beforeAll(async () => {
    const admin = await createTestClient({
      id: `sentry-admin-${testId()}`,
      displayName: "Sentry Admin",
      email: `sentry-admin-${testId()}@openslaq.dev`,
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

    // Get sentry-bot listing ID
    const listRes = await adminClient.api.marketplace.$get({});
    const listings = (await listRes.json()) as Array<{ id: string; slug: string }>;
    const sentryListing = listings.find((l) => l.slug === "sentry-bot");
    expect(sentryListing).toBeDefined();
    sentryListingId = sentryListing!.id;

    // Enable Sentry integration feature flag
    await superAdminClient.api.admin.workspaces[":workspaceId"]["feature-flags"].$patch({
      param: { workspaceId },
      json: { integrationSentry: "true" },
    });
  });

  test("install sentry-bot from marketplace", async () => {
    const res = await adminClient.api.workspaces[":slug"].marketplace.install.$post({
      param: { slug: workspaceSlug },
      json: { listingId: sentryListingId },
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
    expect(installed.installedListingIds).toContain(sentryListingId);
  });

  test("/sentry with no args returns usage", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "sentry", args: "", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages).toHaveLength(1);
    expect(result.ephemeralMessages[0]!.text).toContain("Sentry Bot Commands");
  });

  test("/sentry subscribe creates subscription", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "sentry", args: "subscribe frontend", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0]!.text).toContain("Subscribed to **frontend**");
  });

  test("/sentry subscribe with specific events", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "sentry", args: "subscribe api issues,metrics", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0]!.text).toContain("issues, metrics");
  });

  test("/sentry subscribe with invalid events returns error", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "sentry", args: "subscribe backend bogus,invalid", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0]!.text).toContain("Unknown events");
  });

  test("/sentry subscribe without project slug returns usage", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "sentry", args: "subscribe", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0]!.text).toContain("Usage:");
  });

  test("/sentry subscribe rejects duplicate", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "sentry", args: "subscribe frontend", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0]!.text).toContain("Already subscribed");
  });

  test("/sentry list shows subscriptions", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "sentry", args: "list", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0]!.text).toContain("frontend");
    expect(result.ephemeralMessages[0]!.text).toContain("api");
  });

  // Test ALL event types via /sentry test to cover event-handlers + message-formatter
  describe("test mode events", () => {
    const testEvents = [
      { name: "issue_created", expectedFragment: "issue_created" },
      { name: "issue_resolved", expectedFragment: "issue_resolved" },
      { name: "issue_regression", expectedFragment: "issue_regression" },
      { name: "metric_alert", expectedFragment: "metric_alert" },
      { name: "deploy", expectedFragment: "deploy" },
    ];

    for (const { name, expectedFragment } of testEvents) {
      test(`/sentry test ${name} posts message`, async () => {
        const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
          param: { slug: workspaceSlug },
          json: { command: "sentry", args: `test ${name}`, channelId },
        });
        expect(res.status).toBe(200);
        const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
        expect(result.ok).toBe(true);
        expect(result.ephemeralMessages[0]!.text).toContain(`Test event "${expectedFragment}" posted`);
      });
    }
  });

  test("/sentry test with no event returns usage", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "sentry", args: "test", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0]!.text).toContain("Usage:");
  });

  test("/sentry test unknown event returns error", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "sentry", args: "test nonexistent", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0]!.text).toContain("Unknown test event");
  });

  test("/sentry unknown subcommand returns usage", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "sentry", args: "foobar", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0]!.text).toContain("Sentry Bot Commands");
  });

  test("/sentry unsubscribe without project slug returns usage", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "sentry", args: "unsubscribe", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0]!.text).toContain("Usage:");
  });

  test("/sentry unsubscribe removes subscription", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "sentry", args: "unsubscribe frontend", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0]!.text).toContain("Unsubscribed from **frontend**");
  });

  test("/sentry unsubscribe nonexistent returns not found", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "sentry", args: "unsubscribe nope", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0]!.text).toContain("No subscription");
  });

  test("/sentry list after unsubscribe shows remaining", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "sentry", args: "list", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(true);
    // frontend was unsubscribed, api should remain
    expect(result.ephemeralMessages[0]!.text).toContain("api");
    expect(result.ephemeralMessages[0]!.text).not.toContain("frontend");
  });

  // Unsubscribe remaining so list returns empty
  test("/sentry list when empty shows help", async () => {
    await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "sentry", args: "unsubscribe api", channelId },
    });
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "sentry", args: "list", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0]!.text).toContain("No Sentry subscriptions");
  });

  test("uninstall sentry-bot", async () => {
    const res = await adminClient.api.workspaces[":slug"].marketplace[":listingId"].uninstall.$delete({
      param: { slug: workspaceSlug, listingId: sentryListingId },
    });
    expect(res.status).toBe(200);

    // Verify no longer installed
    const installedRes = await adminClient.api.workspaces[":slug"].marketplace.installed.$get({
      param: { slug: workspaceSlug },
    });
    const installed = (await installedRes.json()) as { installedListingIds: string[] };
    expect(installed.installedListingIds).not.toContain(sentryListingId);
  });

  test("/sentry command without bot installed returns unknown command", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "sentry", args: "subscribe frontend", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Unknown command");
  });

  test("/sentry test without bot installed returns error", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "sentry", args: "test issue_created", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok?: boolean; error?: string; channelId?: string; ephemeralMessages: Array<{ text: string }> };
    expect(result.ok).toBe(false);
  });

  describe("webhook HMAC signature verification", () => {
    const secret = process.env.SENTRY_WEBHOOK_SECRET ?? "test-webhook-secret-123";

    test("valid signature returns 200", async () => {
      const body = JSON.stringify({
        resource: "issue",
        action: "created",
        data: { issue: { project: { id: "test-project-id" } } },
      });
      const res = await fetch(`${getBaseUrl()}/api/integrations/sentry-bot/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "sentry-hook-signature": signPayload(body, secret),
        },
        body,
      });
      expect(res.status).toBe(200);
      const json = (await res.json()) as { ok: boolean };
      expect(json.ok).toBe(true);
    });

    test("invalid signature returns 401", async () => {
      const body = JSON.stringify({
        resource: "issue",
        action: "created",
        data: {},
      });
      const res = await fetch(`${getBaseUrl()}/api/integrations/sentry-bot/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "sentry-hook-signature": signPayload(body, "wrong-secret"),
        },
        body,
      });
      expect(res.status).toBe(401);
    });

    test("missing signature header returns 401", async () => {
      const body = JSON.stringify({
        resource: "issue",
        action: "created",
        data: {},
      });
      const res = await fetch(`${getBaseUrl()}/api/integrations/sentry-bot/webhook`, {
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
    const secret = process.env.SENTRY_WEBHOOK_SECRET ?? "test-webhook-secret-123";

    let wsSlug2: string;
    let _channelId2: string;

    beforeAll(async () => {
      const admin2 = await createTestClient({
        id: `sentry-webhook-admin-${testId()}`,
        displayName: "Sentry Webhook Admin",
        email: `sentry-webhook-admin-${testId()}@openslaq.dev`,
        emailVerified: true,
      });
      const ws2 = await createTestWorkspace(admin2.client);
      wsSlug2 = ws2.slug;

      // Enable feature flag and install sentry-bot
      await superAdminClient.api.admin.workspaces[":workspaceId"]["feature-flags"].$patch({
        param: { workspaceId: ws2.id },
        json: { integrationSentry: "true" },
      });
      const listRes = await admin2.client.api.marketplace.$get({});
      const listings = (await listRes.json()) as Array<{ id: string; slug: string }>;
      const sentryListing = listings.find((l) => l.slug === "sentry-bot");
      await admin2.client.api.workspaces[":slug"].marketplace.install.$post({
        param: { slug: wsSlug2 },
        json: { listingId: sentryListing!.id },
      });

      // Get channel and subscribe with all events
      const chRes = await admin2.client.api.workspaces[":slug"].channels.$get({
        param: { slug: wsSlug2 },
      });
      const channels = (await chRes.json()) as Array<{ id: string; name: string }>;
      const ch = channels.find((c: { id: string; name: string }) => c.name === "general")!;
      _channelId2 = ch.id;

      await admin2.client.api.workspaces[":slug"].commands.execute.$post({
        param: { slug: wsSlug2 },
        json: { command: "sentry", args: "subscribe frontend", channelId: ch.id },
      });
    });

    function sendWebhook(payload: Record<string, unknown>) {
      const body = JSON.stringify(payload);
      return fetch(`${getBaseUrl()}/api/integrations/sentry-bot/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "sentry-hook-signature": signPayload(body, secret),
        },
        body,
      });
    }

    test("Issue created event returns 200", async () => {
      const res = await sendWebhook({
        resource: "issue",
        action: "created",
        data: {
          issue: {
            title: "TypeError: Cannot read property 'map' of undefined",
            culprit: "app/components/UserList.tsx",
            web_url: "https://sentry.io/organizations/acme/issues/12345/",
            project: { id: "frontend", slug: "frontend", name: "frontend" },
            id: "12345",
          },
        },
      });
      expect(res.status).toBe(200);
    });

    test("Issue resolved event returns 200", async () => {
      const res = await sendWebhook({
        resource: "issue",
        action: "resolved",
        data: {
          issue: {
            title: "TypeError: Cannot read property 'map' of undefined",
            web_url: "https://sentry.io/organizations/acme/issues/12345/",
            project: { id: "frontend", slug: "frontend", name: "frontend" },
            id: "12345",
          },
        },
      });
      expect(res.status).toBe(200);
    });

    test("Issue regression event returns 200", async () => {
      const res = await sendWebhook({
        resource: "issue",
        action: "regression",
        data: {
          issue: {
            title: "ConnectionError: Database pool exhausted",
            web_url: "https://sentry.io/organizations/acme/issues/67890/",
            project: { id: "frontend", slug: "frontend", name: "frontend" },
            id: "67890",
          },
        },
      });
      expect(res.status).toBe(200);
    });

    test("Issue escalating event returns 200", async () => {
      const res = await sendWebhook({
        resource: "issue",
        action: "escalating",
        data: {
          issue: {
            title: "RateLimit exceeded",
            web_url: "https://sentry.io/organizations/acme/issues/11111/",
            project: { id: "frontend", slug: "frontend", name: "frontend" },
            id: "11111",
          },
        },
      });
      expect(res.status).toBe(200);
    });

    test("Metric alert event returns 200", async () => {
      const res = await sendWebhook({
        resource: "metric_alert",
        action: "critical",
        data: {
          metric_alert: {
            title: "P95 Latency > 2s",
            projects: ["frontend"],
            web_url: "https://sentry.io/organizations/acme/alerts/42/",
          },
        },
      });
      expect(res.status).toBe(200);
    });

    test("Deploy event returns 200", async () => {
      const res = await sendWebhook({
        resource: "installation",
        action: "deploy",
        data: {
          deploy: {
            project: "frontend",
            version: "v2.4.1",
            environment: "production",
            url: "https://sentry.io/organizations/acme/releases/v2.4.1/",
          },
        },
      });
      expect(res.status).toBe(200);
    });

    test("unknown resource returns 200 (accepted but ignored)", async () => {
      const res = await sendWebhook({
        resource: "unknown",
        action: "create",
        data: {
          issue: { project: { id: "frontend" } },
        },
      });
      expect(res.status).toBe(200);
    });

    test("event without data returns 200 (accepted but ignored)", async () => {
      const res = await sendWebhook({
        resource: "issue",
        action: "created",
      });
      expect(res.status).toBe(200);
    });

    test("event without resource/action returns 200 (accepted but ignored)", async () => {
      const res = await sendWebhook({
        data: { issue: { project: { id: "frontend" } } },
      });
      expect(res.status).toBe(200);
    });

    test("event for unsubscribed project returns 200 (no match)", async () => {
      const res = await sendWebhook({
        resource: "issue",
        action: "created",
        data: {
          issue: {
            title: "Test",
            web_url: "https://sentry.io/organizations/acme/issues/99999/",
            project: { id: "UNKNOWN-PROJECT-ID", slug: "unknown" },
          },
        },
      });
      expect(res.status).toBe(200);
    });
  });

  describe("Sentry connection setup routes", () => {
    let adminHeaders: Record<string, string>;
    let memberHeaders: Record<string, string>;
    let connectWsSlug: string;

    beforeAll(async () => {
      const admin = await createTestClient({
        id: `sentry-connect-admin-${testId()}`,
        displayName: "Sentry Connect Admin",
        email: `sentry-connect-admin-${testId()}@openslaq.dev`,
        emailVerified: true,
      });
      adminHeaders = admin.headers;
      const ws = await createTestWorkspace(admin.client);
      connectWsSlug = ws.slug;

      // Enable feature flag and install sentry-bot from marketplace
      await superAdminClient.api.admin.workspaces[":workspaceId"]["feature-flags"].$patch({
        param: { workspaceId: ws.id },
        json: { integrationSentry: "true" },
      });
      const listRes = await admin.client.api.marketplace.$get({});
      const listings = (await listRes.json()) as Array<{ id: string; slug: string }>;
      const sentryListing = listings.find((l) => l.slug === "sentry-bot");
      await admin.client.api.workspaces[":slug"].marketplace.install.$post({
        param: { slug: connectWsSlug },
        json: { listingId: sentryListing!.id },
      });

      // Create a non-admin member
      const member = await createTestClient({
        id: `sentry-connect-member-${testId()}`,
        displayName: "Sentry Connect Member",
        email: `sentry-connect-member-${testId()}@openslaq.dev`,
        emailVerified: true,
      });
      memberHeaders = member.headers;
      await addToWorkspace(admin.client, connectWsSlug, member.client);
    });

    function connectionUrl() {
      return `${getBaseUrl()}/api/workspaces/${connectWsSlug}/integrations/sentry-bot/connection`;
    }

    function oauthUrl() {
      return `${getBaseUrl()}/api/workspaces/${connectWsSlug}/integrations/sentry-bot/oauth-url`;
    }

    function connectUrl() {
      return `${getBaseUrl()}/api/workspaces/${connectWsSlug}/integrations/sentry-bot/connect`;
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
      // If SENTRY_CLIENT_ID and SENTRY_APP_SLUG are set, returns 200 with URL
      // If not configured, returns 503
      if (res.status === 200) {
        const body = (await res.json()) as { url: string };
        expect(body.url).toContain("sentry.io/sentry-apps/");
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
          installationId: "fake-installation-id",
          orgSlug: "acme",
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
          installationId: "fake-installation-id",
          orgSlug: "acme",
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
