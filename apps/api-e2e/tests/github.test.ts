import { describe, test, expect, beforeAll } from "bun:test";
import { createHmac } from "node:crypto";
import { createTestClient, createTestWorkspace, addToWorkspace, testId, getBaseUrl } from "./helpers/api-client";

function signPayload(body: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

describe("GitHub Bot", () => {
  let adminClient: Awaited<ReturnType<typeof createTestClient>>["client"];
  let superAdminClient: Awaited<ReturnType<typeof createTestClient>>["client"];
  let workspaceSlug: string;
  let workspaceId: string;
  let channelId: string;
  let githubListingId: string;

  beforeAll(async () => {
    const admin = await createTestClient({
      id: `gh-admin-${testId()}`,
      displayName: "GitHub Admin",
      email: `gh-admin-${testId()}@openslaq.dev`,
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

    // Get github-bot listing ID
    const listRes = await adminClient.api.marketplace.$get({});
    const listings = (await listRes.json()) as Array<{ id: string; slug: string }>;
    const ghListing = listings.find((l) => l.slug === "github-bot");
    expect(ghListing).toBeDefined();
    githubListingId = ghListing!.id;

    // Enable GitHub integration feature flag
    await superAdminClient.api.admin.workspaces[":workspaceId"]["feature-flags"].$patch({
      param: { workspaceId },
      json: { integrationGithub: true },
    });
  });

  test("install github-bot from marketplace", async () => {
    const res = await adminClient.api.workspaces[":slug"].marketplace.install.$post({
      param: { slug: workspaceSlug },
      json: { listingId: githubListingId },
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
    expect(installed.installedListingIds).toContain(githubListingId);
  });

  test("/github with no args returns usage", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "github", args: "", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages).toHaveLength(1);
    expect(result.ephemeralMessages[0].text).toContain("GitHub Bot Commands");
  });

  test("/github subscribe creates subscription", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "github", args: "subscribe acme/widget", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0].text).toContain("Subscribed to **acme/widget**");
  });

  test("/github subscribe with specific events", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "github", args: "subscribe acme/other pulls,checks", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0].text).toContain("pulls, checks");
  });

  test("/github subscribe rejects duplicate", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "github", args: "subscribe acme/widget", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0].text).toContain("Already subscribed");
  });

  test("/github list shows subscriptions", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "github", args: "list", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0].text).toContain("acme/widget");
    expect(result.ephemeralMessages[0].text).toContain("acme/other");
  });

  test("/github test pr_opened posts message", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "github", args: "test pr_opened", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0].text).toContain('Test event "pr_opened" posted');
  });

  test("/github test unknown event returns error", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "github", args: "test nonexistent", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0].text).toContain("Unknown test event");
  });

  test("/github unsubscribe removes subscription", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "github", args: "unsubscribe acme/widget", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0].text).toContain("Unsubscribed from **acme/widget**");
  });

  test("/github unsubscribe nonexistent returns not found", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "github", args: "unsubscribe nonexistent/repo", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(true);
    expect(result.ephemeralMessages[0].text).toContain("No subscription");
  });

  test("/github list after unsubscribe shows remaining", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "github", args: "list", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(true);
    // acme/widget was unsubscribed, acme/other should remain
    expect(result.ephemeralMessages[0].text).toContain("acme/other");
    expect(result.ephemeralMessages[0].text).not.toContain("acme/widget");
  });

  test("POST /api/github/webhook with ping returns ok", async () => {
    const body = JSON.stringify({ zen: "test" });
    const secret = process.env.GITHUB_WEBHOOK_SECRET ?? "test-webhook-secret-123";
    const res = await fetch(`${getBaseUrl()}/api/integrations/github-bot/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-GitHub-Event": "ping",
        "X-Hub-Signature-256": signPayload(body, secret),
      },
      body,
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
  });

  test("POST /api/github/webhook without event header returns 400", async () => {
    const body = JSON.stringify({});
    const secret = process.env.GITHUB_WEBHOOK_SECRET ?? "test-webhook-secret-123";
    const res = await fetch(`${getBaseUrl()}/api/integrations/github-bot/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Hub-Signature-256": signPayload(body, secret),
      },
      body,
    });
    expect(res.status).toBe(400);
  });

  test("uninstall github-bot", async () => {
    const res = await adminClient.api.workspaces[":slug"].marketplace[":listingId"].uninstall.$delete({
      param: { slug: workspaceSlug, listingId: githubListingId },
    });
    expect(res.status).toBe(200);

    // Verify no longer installed
    const installedRes = await adminClient.api.workspaces[":slug"].marketplace.installed.$get({
      param: { slug: workspaceSlug },
    });
    const installed = (await installedRes.json()) as { installedListingIds: string[] };
    expect(installed.installedListingIds).not.toContain(githubListingId);
  });

  test("/github command without bot installed returns unknown command", async () => {
    const res = await adminClient.api.workspaces[":slug"].commands.execute.$post({
      param: { slug: workspaceSlug },
      json: { command: "github", args: "subscribe test/repo", channelId },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Unknown command");
  });

  describe("webhook HMAC signature verification", () => {
    const secret = process.env.GITHUB_WEBHOOK_SECRET ?? "test-webhook-secret-123";

    test("valid signature returns 200", async () => {
      const body = JSON.stringify({ zen: "test", hook_id: 1 });
      const res = await fetch(`${getBaseUrl()}/api/integrations/github-bot/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-GitHub-Event": "ping",
          "X-Hub-Signature-256": signPayload(body, secret),
        },
        body,
      });
      expect(res.status).toBe(200);
      const json = (await res.json()) as { ok: boolean };
      expect(json.ok).toBe(true);
    });

    test("invalid signature returns 401", async () => {
      const body = JSON.stringify({ zen: "test" });
      const res = await fetch(`${getBaseUrl()}/api/integrations/github-bot/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-GitHub-Event": "ping",
          "X-Hub-Signature-256": signPayload(body, "wrong-secret"),
        },
        body,
      });
      expect(res.status).toBe(401);
    });

    test("missing signature header returns 401", async () => {
      const body = JSON.stringify({ zen: "test" });
      const res = await fetch(`${getBaseUrl()}/api/integrations/github-bot/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-GitHub-Event": "ping",
        },
        body,
      });
      expect(res.status).toBe(401);
    });

    // Note: When GITHUB_WEBHOOK_SECRET is not configured, the server now returns 503
    // instead of silently accepting all requests. This can't be tested in e2e since
    // the dev server runs with the secret set, but the code path is:
    //   if (!env.GITHUB_WEBHOOK_SECRET) return 503
  });

  describe("webhook event processing", () => {
    const secret = process.env.GITHUB_WEBHOOK_SECRET ?? "test-webhook-secret-123";

    // Re-install github-bot and create subscription for this sub-suite
    let wsSlug2: string;

    beforeAll(async () => {
      const admin2 = await createTestClient({
        id: `gh-webhook-admin-${testId()}`,
        displayName: "GH Webhook Admin",
        email: `gh-webhook-admin-${testId()}@openslaq.dev`,
        emailVerified: true,
      });
      const ws2 = await createTestWorkspace(admin2.client);
      wsSlug2 = ws2.slug;

      // Enable feature flag and install github-bot
      await superAdminClient.api.admin.workspaces[":workspaceId"]["feature-flags"].$patch({
        param: { workspaceId: ws2.id },
        json: { integrationGithub: true },
      });
      const listRes = await admin2.client.api.marketplace.$get({});
      const listings = (await listRes.json()) as Array<{ id: string; slug: string }>;
      const ghListing = listings.find((l) => l.slug === "github-bot");
      await admin2.client.api.workspaces[":slug"].marketplace.install.$post({
        param: { slug: wsSlug2 },
        json: { listingId: ghListing!.id },
      });

      // Get channel and subscribe
      const chRes = await admin2.client.api.workspaces[":slug"].channels.$get({
        param: { slug: wsSlug2 },
      });
      const channels = (await chRes.json()) as any[];
      const ch = channels.find((c: any) => c.name === "general");

      await admin2.client.api.workspaces[":slug"].commands.execute.$post({
        param: { slug: wsSlug2 },
        json: { command: "github", args: "subscribe test-org/test-repo", channelId: ch.id },
      });
    });

    test("pull_request opened event with valid signature returns 200", async () => {
      const body = JSON.stringify({
        action: "opened",
        repository: { full_name: "test-org/test-repo" },
        pull_request: {
          number: 99,
          title: "Test PR",
          html_url: "https://github.com/test-org/test-repo/pull/99",
          user: { login: "testuser" },
          body: "Description",
          base: { ref: "main" },
          additions: 5,
          deletions: 2,
        },
      });
      const res = await fetch(`${getBaseUrl()}/api/integrations/github-bot/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-GitHub-Event": "pull_request",
          "X-Hub-Signature-256": signPayload(body, secret),
        },
        body,
      });
      expect(res.status).toBe(200);
    });
  });

  describe("GitHub installation setup routes", () => {
    let adminHeaders: Record<string, string>;
    let memberHeaders: Record<string, string>;
    let installWsSlug: string;

    beforeAll(async () => {
      const admin = await createTestClient({
        id: `gh-install-admin-${testId()}`,
        displayName: "GH Install Admin",
        email: `gh-install-admin-${testId()}@openslaq.dev`,
        emailVerified: true,
      });
      adminHeaders = admin.headers;
      const ws = await createTestWorkspace(admin.client);
      installWsSlug = ws.slug;

      // Enable feature flag and install github-bot from marketplace
      await superAdminClient.api.admin.workspaces[":workspaceId"]["feature-flags"].$patch({
        param: { workspaceId: ws.id },
        json: { integrationGithub: true },
      });
      const listRes = await admin.client.api.marketplace.$get({});
      const listings = (await listRes.json()) as Array<{ id: string; slug: string }>;
      const ghListing = listings.find((l) => l.slug === "github-bot");
      await admin.client.api.workspaces[":slug"].marketplace.install.$post({
        param: { slug: installWsSlug },
        json: { listingId: ghListing!.id },
      });

      // Create a non-admin member
      const member = await createTestClient({
        id: `gh-install-member-${testId()}`,
        displayName: "GH Install Member",
        email: `gh-install-member-${testId()}@openslaq.dev`,
        emailVerified: true,
      });
      memberHeaders = member.headers;
      await addToWorkspace(admin.client, installWsSlug, member.client);
    });

    function installUrl() {
      return `${getBaseUrl()}/api/workspaces/${installWsSlug}/integrations/github-bot/installation`;
    }

    test("GET installation before linking returns null", async () => {
      const res = await fetch(installUrl(), {
        headers: { ...adminHeaders },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { installation: null };
      expect(body.installation).toBeNull();
    });

    test("POST link installation returns 200", async () => {
      const res = await fetch(installUrl(), {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          installationId: "12345",
          accountLogin: "test-org",
          accountType: "Organization",
        }),
      });
      expect(res.status).toBe(200);
    });

    test("POST link installation again returns 409", async () => {
      const res = await fetch(installUrl(), {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          installationId: "99999",
          accountLogin: "other-org",
          accountType: "Organization",
        }),
      });
      expect(res.status).toBe(409);
    });

    test("GET installation after linking returns object", async () => {
      const res = await fetch(installUrl(), {
        headers: { ...adminHeaders },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { installation: { githubInstallationId: string; githubAccountLogin: string } };
      expect(body.installation).not.toBeNull();
      expect(body.installation.githubInstallationId).toBe("12345");
      expect(body.installation.githubAccountLogin).toBe("test-org");
    });

    test("non-admin POST returns 403", async () => {
      const res = await fetch(installUrl(), {
        method: "POST",
        headers: { ...memberHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          installationId: "55555",
          accountLogin: "member-org",
          accountType: "User",
        }),
      });
      expect(res.status).toBe(403);
    });
  });
});
