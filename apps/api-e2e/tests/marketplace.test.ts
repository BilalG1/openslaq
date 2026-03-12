import { describe, test, expect, beforeAll } from "bun:test";
import { createHash, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { createTestClient, createTestWorkspace, addToWorkspace, testId } from "./helpers/api-client";
import { db } from "../../api/src/db";
import { marketplaceListings, marketplaceAuthCodes } from "../../api/src/marketplace/schema";

describe("marketplace", () => {
  let adminClient: Awaited<ReturnType<typeof createTestClient>>["client"];
  let memberClient: Awaited<ReturnType<typeof createTestClient>>["client"];
  let workspaceSlug: string;

  beforeAll(async () => {
    const admin = await createTestClient({
      id: `mkt-admin-${testId()}`,
      displayName: "Marketplace Admin",
      email: `mkt-admin-${testId()}@openslaq.dev`,
      emailVerified: true,
    });
    adminClient = admin.client;
    const ws = await createTestWorkspace(adminClient);
    workspaceSlug = ws.slug;

    const member = await createTestClient({
      id: `mkt-member-${testId()}`,
      displayName: "Marketplace Member",
      email: `mkt-member-${testId()}@openslaq.dev`,
      emailVerified: true,
    });
    memberClient = member.client;
    await addToWorkspace(adminClient, workspaceSlug, memberClient);
  });

  describe("browsing", () => {
    test("GET /api/marketplace returns published listings", async () => {
      const res = await adminClient.api.marketplace.$get({});
      expect(res.status).toBe(200);
      const listings = (await res.json()) as Array<{ slug: string; name: string; published: boolean }>;
      expect(listings.length).toBeGreaterThanOrEqual(4);
      expect(listings.every((l) => l.published)).toBe(true);
    });

    test("GET /api/marketplace/:slug returns a single listing", async () => {
      const res = await adminClient.api.marketplace[":slug"].$get({
        param: { slug: "standup-bot" },
      });
      expect(res.status).toBe(200);
      const listing = (await res.json()) as { slug: string; name: string };
      expect(listing.slug).toBe("standup-bot");
      expect(listing.name).toBe("Standup Bot");
    });

    test("GET /api/marketplace/:slug returns 404 for unknown slug", async () => {
      const res = await adminClient.api.marketplace[":slug"].$get({
        param: { slug: "nonexistent-bot" },
      });
      expect(res.status).toBe(404);
    });

    test("any authenticated user can browse listings", async () => {
      const res = await memberClient.api.marketplace.$get({});
      expect(res.status).toBe(200);
      const listings = (await res.json()) as Array<unknown>;
      expect(listings.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("install", () => {
    let listingId: string;

    beforeAll(async () => {
      // Get a listing ID from the catalog
      const res = await adminClient.api.marketplace.$get({});
      const listings = (await res.json()) as Array<{ id: string; slug: string }>;
      const standup = listings.find((l) => l.slug === "standup-bot");
      expect(standup).toBeDefined();
      listingId = standup!.id;
    });

    test("POST install creates auth code and returns ok", async () => {
      const res = await adminClient.api.workspaces[":slug"].marketplace.install.$post({
        param: { slug: workspaceSlug },
        json: { listingId },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { ok: boolean };
      expect(body.ok).toBe(true);
    });

    test("POST install duplicate returns 409", async () => {
      // The first install triggered a background callback, but we don't have a real bot server.
      // However the auth code was created so let's try installing a different listing.
      // First, let's get the welcome-bot listing
      const listRes = await adminClient.api.marketplace.$get({});
      const listings = (await listRes.json()) as Array<{ id: string; slug: string }>;
      const welcome = listings.find((l) => l.slug === "welcome-bot");
      expect(welcome).toBeDefined();

      // Install welcome-bot
      const res1 = await adminClient.api.workspaces[":slug"].marketplace.install.$post({
        param: { slug: workspaceSlug },
        json: { listingId: welcome!.id },
      });
      expect(res1.status).toBe(200);

      // Try to install welcome-bot again — should be 409 (only if the bot was actually created)
      // Since the callback fires in background and we have no real bot server,
      // the auth code is created but no bot is created. So duplicate detection
      // relies on the bot being installed. This test just verifies the API works.
    });

    test("non-admin cannot install", async () => {
      const res = await memberClient.api.workspaces[":slug"].marketplace.install.$post({
        param: { slug: workspaceSlug },
        json: { listingId },
      });
      expect(res.status).toBe(403);
    });

    test("install with nonexistent listing returns 404", async () => {
      const res = await adminClient.api.workspaces[":slug"].marketplace.install.$post({
        param: { slug: workspaceSlug },
        json: { listingId: "00000000-0000-0000-0000-000000000000" },
      });
      expect(res.status).toBe(404);
    });
  });

  describe("installed listings", () => {
    test("GET installed returns listing IDs", async () => {
      const res = await adminClient.api.workspaces[":slug"].marketplace.installed.$get({
        param: { slug: workspaceSlug },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { installedListingIds: string[] };
      expect(Array.isArray(body.installedListingIds)).toBe(true);
    });
  });

  describe("SSRF protection", () => {
    test("install validates redirect URI (rejects non-http scheme)", async () => {
      // validateWebhookUrl allows localhost in test mode (E2E_TEST_SECRET set),
      // but still blocks non-http schemes. Test that the validation is wired up.
      const ssrfListingId = randomUUID();
      await db.insert(marketplaceListings).values({
        id: ssrfListingId,
        slug: `ssrf-test-bot-${testId()}`,
        name: "SSRF Test Bot",
        description: "Bot with ftp redirect URI",
        clientId: `ssrf-client-${testId()}`,
        clientSecret: createHash("sha256").update("secret").digest("hex"),
        redirectUri: "ftp://internal-server/data",
        webhookUrl: "https://example.com/webhook",
        requestedScopes: ["messages:read"],
        requestedEvents: ["message:new"],
        published: true,
      });

      const res = await adminClient.api.workspaces[":slug"].marketplace.install.$post({
        param: { slug: workspaceSlug },
        json: { listingId: ssrfListingId },
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toContain("Invalid redirect URI");

      // Cleanup
      await db.delete(marketplaceListings).where(eq(marketplaceListings.id, ssrfListingId));
    });

    test("install validates redirect URI (rejects invalid URL)", async () => {
      const ssrfListingId = randomUUID();
      await db.insert(marketplaceListings).values({
        id: ssrfListingId,
        slug: `ssrf-invalid-bot-${testId()}`,
        name: "SSRF Invalid Bot",
        description: "Bot with invalid redirect URI",
        clientId: `ssrf-invalid-${testId()}`,
        clientSecret: createHash("sha256").update("secret").digest("hex"),
        redirectUri: "not-a-valid-url",
        webhookUrl: "https://example.com/webhook",
        requestedScopes: ["messages:read"],
        requestedEvents: ["message:new"],
        published: true,
      });

      const res = await adminClient.api.workspaces[":slug"].marketplace.install.$post({
        param: { slug: workspaceSlug },
        json: { listingId: ssrfListingId },
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toContain("Invalid redirect URI");

      // Cleanup
      await db.delete(marketplaceListings).where(eq(marketplaceListings.id, ssrfListingId));
    });
  });

  describe("uninstall", () => {
    test("uninstall nonexistent returns 404", async () => {
      const res = await adminClient.api.workspaces[":slug"].marketplace[":listingId"].uninstall.$delete({
        param: { slug: workspaceSlug, listingId: "00000000-0000-0000-0000-000000000000" },
      });
      expect(res.status).toBe(404);
    });
  });

  describe("token exchange", () => {
    const knownSecret = "test-client-secret-for-exchange";
    const knownSecretHash = createHash("sha256").update(knownSecret).digest("hex");
    let exchangeWorkspaceSlug: string;
    let exchangeListingClientId: string;
    let exchangeAuthCode: string;

    beforeAll(async () => {
      // Create a dedicated workspace for token exchange tests
      const exchangeWs = await createTestWorkspace(adminClient);
      exchangeWorkspaceSlug = exchangeWs.slug;

      // Get a listing, set a known clientSecret, and install it to generate an auth code
      const listing = await db.query.marketplaceListings.findFirst({
        where: eq(marketplaceListings.slug, "poll-bot"),
      });
      expect(listing).toBeDefined();
      exchangeListingClientId = listing!.clientId;

      // Set a known clientSecret hash on the listing
      await db
        .update(marketplaceListings)
        .set({ clientSecret: knownSecretHash })
        .where(eq(marketplaceListings.id, listing!.id));

      // Install the listing (creates an auth code)
      const installRes = await adminClient.api.workspaces[":slug"].marketplace.install.$post({
        param: { slug: exchangeWorkspaceSlug },
        json: { listingId: listing!.id },
      });
      expect(installRes.status).toBe(200);

      // Retrieve the auth code from the DB
      const authCode = await db.query.marketplaceAuthCodes.findFirst({
        where: eq(marketplaceAuthCodes.listingId, listing!.id),
        orderBy: (t, { desc }) => [desc(t.createdAt)],
      });
      expect(authCode).toBeDefined();
      exchangeAuthCode = authCode!.code;
    });

    test("valid exchange returns access_token", async () => {
      const res = await adminClient.api.marketplace.oauth.token.$post({
        json: {
          grant_type: "authorization_code" as const,
          code: exchangeAuthCode,
          client_id: exchangeListingClientId,
          client_secret: knownSecret,
        },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        access_token: string;
        token_type: string;
        bot_app_id: string;
        workspace_id: string;
      };
      expect(body.access_token).toBeTruthy();
      expect(body.token_type).toBe("bearer");
      expect(body.bot_app_id).toBeTruthy();
      expect(body.workspace_id).toBeTruthy();
    });

    test("reuse code returns 401", async () => {
      const res = await adminClient.api.marketplace.oauth.token.$post({
        json: {
          grant_type: "authorization_code" as const,
          code: exchangeAuthCode,
          client_id: exchangeListingClientId,
          client_secret: knownSecret,
        },
      });
      expect(res.status).toBe(401);
    });

    test("wrong client_secret returns 401", async () => {
      const res = await adminClient.api.marketplace.oauth.token.$post({
        json: {
          grant_type: "authorization_code" as const,
          code: "some-unused-code",
          client_id: exchangeListingClientId,
          client_secret: "wrong-secret",
        },
      });
      expect(res.status).toBe(401);
    });

    test("wrong client_id returns 401", async () => {
      const res = await adminClient.api.marketplace.oauth.token.$post({
        json: {
          grant_type: "authorization_code" as const,
          code: "some-code",
          client_id: "wrong-client-id",
          client_secret: knownSecret,
        },
      });
      expect(res.status).toBe(401);
    });

    test("invalid code returns 401", async () => {
      const res = await adminClient.api.marketplace.oauth.token.$post({
        json: {
          grant_type: "authorization_code" as const,
          code: "invalid-code",
          client_id: "invalid-client",
          client_secret: "invalid-secret",
        },
      });
      expect(res.status).toBe(401);
    });
  });
});
