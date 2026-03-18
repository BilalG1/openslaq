import { describe, test, expect, beforeAll } from "bun:test";
import { createHmac } from "node:crypto";
import { createTestClient, createTestWorkspace, addToWorkspace, testId, getBaseUrl } from "./helpers/api-client";

function signPayload(body: string, secret: string): string {
  // Linear uses raw hex (no sha256= prefix)
  return createHmac("sha256", secret).update(body).digest("hex");
}

describe("Linear Bot", () => {
  let adminClient: Awaited<ReturnType<typeof createTestClient>>["client"];
  let superAdminClient: Awaited<ReturnType<typeof createTestClient>>["client"];
  let workspaceSlug: string;
  let workspaceId: string;
  let channelId: string;
  let linearListingId: string;

  beforeAll(async () => {
    const admin = await createTestClient({
      id: `linear-admin-${testId()}`,
      displayName: "Linear Admin",
      email: `linear-admin-${testId()}@openslaq.dev`,
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
    const channels = (await chRes.json()) as any[];
    channelId = channels.find((c: any) => c.name === "general")?.id;
    expect(channelId).toBeTruthy();

    // Get linear-bot listing ID
    const listRes = await adminClient.api.marketplace.$get({});
    const listings = (await listRes.json()) as Array<{ id: string; slug: string }>;
    const linearListing = listings.find((l) => l.slug === "linear-bot");
    expect(linearListing).toBeDefined();
    linearListingId = linearListing!.id;

    // Enable Linear integration feature flag
    await superAdminClient.api.admin.workspaces[":workspaceId"]["feature-flags"].$patch({
      param: { workspaceId },
      json: { integrationLinear: true },
    });
  });

  test("install linear-bot from marketplace", async () => {
    const res = await adminClient.api.workspaces[":slug"].marketplace.install.$post({
      param: { slug: workspaceSlug },
      json: { listingId: linearListingId },
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
    expect(installed.installedListingIds).toContain(linearListingId);
  });

  test("/linear with no args returns usage", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "linear", args: "", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages).toHaveLength(1);
    expect(result.ephemeralMessages[0].text).toContain("Linear Bot Commands");
  });

  test("/linear subscribe creates subscription", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "linear", args: "subscribe BAC", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0].text).toContain("Subscribed to **BAC**");
  });

  test("/linear subscribe with specific events", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "linear", args: "subscribe ENG issues,comments", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0].text).toContain("issues, comments");
  });

  test("/linear subscribe with invalid events returns error", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "linear", args: "subscribe FRO bogus,invalid", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0].text).toContain("Unknown events");
  });

  test("/linear subscribe without team key returns usage", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "linear", args: "subscribe", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0].text).toContain("Usage:");
  });

  test("/linear subscribe rejects duplicate", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "linear", args: "subscribe BAC", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0].text).toContain("Already subscribed");
  });

  test("/linear list shows subscriptions", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "linear", args: "list", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0].text).toContain("BAC");
    expect(result.ephemeralMessages[0].text).toContain("ENG");
  });

  // Test ALL event types via /linear test to cover event-handlers + message-formatter
  describe("test mode events", () => {
    const testEvents = [
      { name: "issue_created", expectedFragment: "issue_created" },
      { name: "issue_closed", expectedFragment: "issue_closed" },
      { name: "issue_assigned", expectedFragment: "issue_assigned" },
      { name: "comment_created", expectedFragment: "comment_created" },
      { name: "project_updated", expectedFragment: "project_updated" },
      { name: "cycle_started", expectedFragment: "cycle_started" },
      { name: "cycle_completed", expectedFragment: "cycle_completed" },
    ];

    for (const { name, expectedFragment } of testEvents) {
      test(`/linear test ${name} posts message`, async () => {
        const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
          param: { slug: workspaceSlug },
          json: { command: "linear", args: `test ${name}`, channelId },
        });
        expect(res.status).toBe(200);
        const result = (await res.json()) as any;
        expect(result.ok).toBe(true);
        expect(result.ephemeralMessages[0].text).toContain(`Test event "${expectedFragment}" posted`);
      });
    }
  });

  test("/linear test with no event returns usage", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "linear", args: "test", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0].text).toContain("Usage:");
  });

  test("/linear test unknown event returns error", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "linear", args: "test nonexistent", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0].text).toContain("Unknown test event");
  });

  test("/linear unknown subcommand returns usage", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "linear", args: "foobar", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0].text).toContain("Linear Bot Commands");
  });

  test("/linear unsubscribe without team key returns usage", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "linear", args: "unsubscribe", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0].text).toContain("Usage:");
  });

  test("/linear unsubscribe removes subscription", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "linear", args: "unsubscribe BAC", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0].text).toContain("Unsubscribed from **BAC**");
  });

  test("/linear unsubscribe nonexistent returns not found", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "linear", args: "unsubscribe NOPE", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0].text).toContain("No subscription");
  });

  test("/linear list after unsubscribe shows remaining", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "linear", args: "list", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(true);
    // BAC was unsubscribed, ENG should remain
    expect(result.ephemeralMessages[0].text).toContain("ENG");
    expect(result.ephemeralMessages[0].text).not.toContain("BAC");
  });

  // Unsubscribe remaining so list returns empty
  test("/linear list when empty shows help", async () => {
    await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "linear", args: "unsubscribe ENG", channelId },
    });
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "linear", args: "list", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0].text).toContain("No Linear subscriptions");
  });

  test("uninstall linear-bot", async () => {
    const res = await adminClient.api.workspaces[":slug"].marketplace[":listingId"].uninstall.$delete({
      param: { slug: workspaceSlug, listingId: linearListingId },
    });
    expect(res.status).toBe(200);

    // Verify no longer installed
    const installedRes = await adminClient.api.workspaces[":slug"].marketplace.installed.$get({
      param: { slug: workspaceSlug },
    });
    const installed = (await installedRes.json()) as { installedListingIds: string[] };
    expect(installed.installedListingIds).not.toContain(linearListingId);
  });

  test("/linear command without bot installed returns unknown command", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "linear", args: "subscribe test/repo", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Unknown command");
  });

  // Re-install for test mode bot-not-installed check
  test("/linear test without bot installed returns error", async () => {
    // Bot was uninstalled above — test command should fail gracefully
    // Re-install first to get the command registered, then uninstall mid-flow won't apply
    // Instead, test the "bot not installed" path by re-installing, uninstalling, then using test
    // Actually, command already returns "Unknown command" when bot not installed (tested above)
    // This test verifies the subscribe path without bot
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "linear", args: "test issue_created", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(false);
  });

  describe("webhook HMAC signature verification", () => {
    const secret = process.env.LINEAR_WEBHOOK_SECRET ?? "test-webhook-secret-123";

    test("valid signature returns 200", async () => {
      const body = JSON.stringify({
        type: "Issue",
        action: "create",
        data: { team: { id: "test-team-id" } },
      });
      const res = await fetch(`${getBaseUrl()}/api/integrations/linear-bot/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Linear-Signature": signPayload(body, secret),
        },
        body,
      });
      expect(res.status).toBe(200);
      const json = (await res.json()) as { ok: boolean };
      expect(json.ok).toBe(true);
    });

    test("invalid signature returns 401", async () => {
      const body = JSON.stringify({
        type: "Issue",
        action: "create",
        data: {},
      });
      const res = await fetch(`${getBaseUrl()}/api/integrations/linear-bot/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Linear-Signature": signPayload(body, "wrong-secret"),
        },
        body,
      });
      expect(res.status).toBe(401);
    });

    test("missing signature header returns 401", async () => {
      const body = JSON.stringify({
        type: "Issue",
        action: "create",
        data: {},
      });
      const res = await fetch(`${getBaseUrl()}/api/integrations/linear-bot/webhook`, {
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
    const secret = process.env.LINEAR_WEBHOOK_SECRET ?? "test-webhook-secret-123";

    let wsSlug2: string;
    let _channelId2: string;

    beforeAll(async () => {
      const admin2 = await createTestClient({
        id: `linear-webhook-admin-${testId()}`,
        displayName: "Linear Webhook Admin",
        email: `linear-webhook-admin-${testId()}@openslaq.dev`,
        emailVerified: true,
      });
      const ws2 = await createTestWorkspace(admin2.client);
      wsSlug2 = ws2.slug;

      // Enable feature flag and install linear-bot
      await superAdminClient.api.admin.workspaces[":workspaceId"]["feature-flags"].$patch({
        param: { workspaceId: ws2.id },
        json: { integrationLinear: true },
      });
      const listRes = await admin2.client.api.marketplace.$get({});
      const listings = (await listRes.json()) as Array<{ id: string; slug: string }>;
      const linearListing = listings.find((l) => l.slug === "linear-bot");
      await admin2.client.api.workspaces[":slug"].marketplace.install.$post({
        param: { slug: wsSlug2 },
        json: { listingId: linearListing!.id },
      });

      // Get channel and subscribe with all events
      const chRes = await admin2.client.api.workspaces[":slug"].channels.$get({
        param: { slug: wsSlug2 },
      });
      const channels = (await chRes.json()) as any[];
      const ch = channels.find((c: any) => c.name === "general");
      _channelId2 = ch.id;

      await admin2.client.api.workspaces[":slug"].commands.execute.$post({
        param: { slug: wsSlug2 },
        json: { command: "linear", args: "subscribe BAC", channelId: ch.id },
      });
    });

    function sendWebhook(payload: Record<string, unknown>) {
      const body = JSON.stringify(payload);
      return fetch(`${getBaseUrl()}/api/integrations/linear-bot/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Linear-Signature": signPayload(body, secret),
        },
        body,
      });
    }

    test("Issue create event returns 200", async () => {
      const res = await sendWebhook({
        type: "Issue",
        action: "create",
        createdBy: { name: "Alice" },
        data: {
          identifier: "BAC-99",
          title: "Test Issue",
          url: "https://linear.app/acme/issue/BAC-99",
          description: "Test description",
          priority: 2,
          team: { id: "BAC", key: "BAC" },
          state: { name: "Todo" },
        },
      });
      expect(res.status).toBe(200);
    });

    test("Issue status change event returns 200", async () => {
      const res = await sendWebhook({
        type: "Issue",
        action: "update",
        updatedFrom: { stateId: "old-state-id" },
        data: {
          identifier: "BAC-99",
          title: "Test Issue",
          url: "https://linear.app/acme/issue/BAC-99",
          team: { id: "BAC", key: "BAC" },
          state: { name: "In Progress" },
        },
      });
      expect(res.status).toBe(200);
    });

    test("Issue assignment event returns 200", async () => {
      const res = await sendWebhook({
        type: "Issue",
        action: "update",
        updatedFrom: { assigneeId: null },
        data: {
          identifier: "BAC-99",
          title: "Test Issue",
          url: "https://linear.app/acme/issue/BAC-99",
          team: { id: "BAC", key: "BAC" },
          assignee: { name: "Bob" },
        },
      });
      expect(res.status).toBe(200);
    });

    test("Issue label change event returns 200", async () => {
      const res = await sendWebhook({
        type: "Issue",
        action: "update",
        updatedFrom: { labelIds: [] },
        data: {
          identifier: "BAC-99",
          title: "Test Issue",
          url: "https://linear.app/acme/issue/BAC-99",
          team: { id: "BAC", key: "BAC" },
          labels: { nodes: [{ name: "bug" }, { name: "urgent" }] },
        },
      });
      expect(res.status).toBe(200);
    });

    test("Comment create event returns 200", async () => {
      const res = await sendWebhook({
        type: "Comment",
        action: "create",
        data: {
          body: "This looks good!",
          user: { name: "Charlie" },
          issue: {
            identifier: "BAC-99",
            title: "Test Issue",
            url: "https://linear.app/acme/issue/BAC-99",
            team: { id: "BAC", key: "BAC" },
          },
        },
      });
      expect(res.status).toBe(200);
    });

    test("Project update event returns 200", async () => {
      const res = await sendWebhook({
        type: "Project",
        action: "update",
        data: {
          name: "Q1 Launch",
          url: "https://linear.app/acme/project/q1",
          state: "started",
          // No team — project events use global matching
          team: { id: "BAC", key: "BAC" },
        },
      });
      expect(res.status).toBe(200);
    });

    test("Cycle create (started) event returns 200", async () => {
      const res = await sendWebhook({
        type: "Cycle",
        action: "create",
        data: {
          name: "Sprint 12",
          number: 12,
          url: "https://linear.app/acme/cycle/12",
          startsAt: new Date().toISOString(),
          team: { id: "BAC", key: "BAC" },
        },
      });
      expect(res.status).toBe(200);
    });

    test("Cycle completed event returns 200", async () => {
      const res = await sendWebhook({
        type: "Cycle",
        action: "update",
        updatedFrom: { completedAt: null },
        data: {
          name: "Sprint 11",
          number: 11,
          url: "https://linear.app/acme/cycle/11",
          completedAt: new Date().toISOString(),
          team: { id: "BAC", key: "BAC" },
          issueCountHistory: 15,
          completedIssueCountHistory: 13,
        },
      });
      expect(res.status).toBe(200);
    });

    test("unknown event type returns 200 (accepted but ignored)", async () => {
      const res = await sendWebhook({
        type: "Unknown",
        action: "create",
        data: {
          team: { id: "BAC", key: "BAC" },
        },
      });
      expect(res.status).toBe(200);
    });

    test("event without data returns 200 (accepted but ignored)", async () => {
      const res = await sendWebhook({
        type: "Issue",
        action: "create",
      });
      expect(res.status).toBe(200);
    });

    test("event without type/action returns 200 (accepted but ignored)", async () => {
      const res = await sendWebhook({
        data: { team: { id: "BAC" } },
      });
      expect(res.status).toBe(200);
    });

    test("event for unsubscribed team returns 200 (no match)", async () => {
      const res = await sendWebhook({
        type: "Issue",
        action: "create",
        data: {
          team: { id: "UNKNOWN-TEAM-ID", key: "UNK" },
          identifier: "UNK-1",
          title: "Test",
          url: "https://linear.app/acme/issue/UNK-1",
        },
      });
      expect(res.status).toBe(200);
    });

    test("issue update without updatedFrom is ignored", async () => {
      const res = await sendWebhook({
        type: "Issue",
        action: "update",
        data: {
          identifier: "BAC-99",
          title: "Test Issue",
          url: "https://linear.app/acme/issue/BAC-99",
          team: { id: "BAC", key: "BAC" },
          state: { name: "In Progress" },
        },
      });
      expect(res.status).toBe(200);
    });

    test("comment update (non-create) is ignored", async () => {
      const res = await sendWebhook({
        type: "Comment",
        action: "update",
        data: {
          body: "Edited comment",
          user: { name: "Charlie" },
          issue: {
            identifier: "BAC-99",
            title: "Test",
            url: "https://linear.app/acme/issue/BAC-99",
            team: { id: "BAC", key: "BAC" },
          },
        },
      });
      expect(res.status).toBe(200);
    });
  });

  describe("Linear connection setup routes", () => {
    let adminHeaders: Record<string, string>;
    let memberHeaders: Record<string, string>;
    let connectWsSlug: string;

    beforeAll(async () => {
      const admin = await createTestClient({
        id: `linear-connect-admin-${testId()}`,
        displayName: "Linear Connect Admin",
        email: `linear-connect-admin-${testId()}@openslaq.dev`,
        emailVerified: true,
      });
      adminHeaders = admin.headers;
      const ws = await createTestWorkspace(admin.client);
      connectWsSlug = ws.slug;

      // Enable feature flag and install linear-bot from marketplace
      await superAdminClient.api.admin.workspaces[":workspaceId"]["feature-flags"].$patch({
        param: { workspaceId: ws.id },
        json: { integrationLinear: true },
      });
      const listRes = await admin.client.api.marketplace.$get({});
      const listings = (await listRes.json()) as Array<{ id: string; slug: string }>;
      const linearListing = listings.find((l) => l.slug === "linear-bot");
      await admin.client.api.workspaces[":slug"].marketplace.install.$post({
        param: { slug: connectWsSlug },
        json: { listingId: linearListing!.id },
      });

      // Create a non-admin member
      const member = await createTestClient({
        id: `linear-connect-member-${testId()}`,
        displayName: "Linear Connect Member",
        email: `linear-connect-member-${testId()}@openslaq.dev`,
        emailVerified: true,
      });
      memberHeaders = member.headers;
      await addToWorkspace(admin.client, connectWsSlug, member.client);
    });

    function connectionUrl() {
      return `${getBaseUrl()}/api/workspaces/${connectWsSlug}/integrations/linear-bot/connection`;
    }

    function oauthUrl() {
      return `${getBaseUrl()}/api/workspaces/${connectWsSlug}/integrations/linear-bot/oauth-url`;
    }

    function connectUrl() {
      return `${getBaseUrl()}/api/workspaces/${connectWsSlug}/integrations/linear-bot/connect`;
    }

    test("GET connection before connecting returns null", async () => {
      const res = await fetch(connectionUrl(), {
        headers: { ...adminHeaders },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { connection: null };
      expect(body.connection).toBeNull();
    });

    test("GET oauth-url returns authorization URL", async () => {
      const res = await fetch(oauthUrl(), {
        headers: { ...adminHeaders },
      });
      // If LINEAR_CLIENT_ID is set, returns 200 with URL
      // If not configured, returns 503
      if (res.status === 200) {
        const body = (await res.json()) as { url: string };
        expect(body.url).toContain("linear.app/oauth/authorize");
        expect(body.url).toContain("client_id=");
      } else {
        expect(res.status).toBe(503);
      }
    });

    test("POST connect with invalid code returns 400", async () => {
      const res = await fetch(connectUrl(), {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          code: "invalid-code-that-wont-work",
          redirectUri: "http://localhost:3000/callback",
        }),
      });
      // Should return 400 (failed to exchange) since the code is invalid
      // or 503 if LINEAR_CLIENT_ID/SECRET not configured
      expect([400, 503]).toContain(res.status);
    });

    test("non-admin POST connect returns 403", async () => {
      const res = await fetch(connectUrl(), {
        method: "POST",
        headers: { ...memberHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          code: "test-code",
          redirectUri: "http://localhost:3000/callback",
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
