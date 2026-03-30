import { describe, test, expect, beforeAll } from "bun:test";
import { createTestClient, createTestWorkspace, addToWorkspace, testId, getBaseUrl } from "./helpers/api-client";

describe("Feature Flags", () => {
  let adminClient: Awaited<ReturnType<typeof createTestClient>>["client"];
  let adminHeaders: Record<string, string>;
  let memberClient: Awaited<ReturnType<typeof createTestClient>>["client"];
  let workspaceSlug: string;
  let workspaceId: string;

  // Create a super-admin client for admin endpoints
  let superAdminClient: Awaited<ReturnType<typeof createTestClient>>["client"];

  beforeAll(async () => {
    const admin = await createTestClient({
      id: `ff-admin-${testId()}`,
      displayName: "FF Admin",
      email: `ff-admin-${testId()}@openslaq.dev`,
      emailVerified: true,
    });
    adminClient = admin.client;
    adminHeaders = admin.headers;
    const ws = await createTestWorkspace(adminClient);
    workspaceSlug = ws.slug;
    workspaceId = ws.id;

    const member = await createTestClient({
      id: `ff-member-${testId()}`,
      displayName: "FF Member",
      email: `ff-member-${testId()}@openslaq.dev`,
      emailVerified: true,
    });
    memberClient = member.client;
    await addToWorkspace(adminClient, workspaceSlug, memberClient);

    // Create super-admin client using the configured admin user ID
    const superAdmin = await createTestClient({
      id: process.env.ADMIN_USER_IDS?.split(",")[0] || "admin-user",
      displayName: "Super Admin",
      email: `super-admin-${testId()}@openslaq.dev`,
      emailVerified: true,
    });
    superAdminClient = superAdmin.client;
  });

  test("flags default to expected values for new workspaces", async () => {
    const res = await adminClient.api.workspaces[":slug"]["feature-flags"].$get({
      param: { slug: workspaceSlug },
    });
    expect(res.status).toBe(200);
    const flags = (await res.json()) as Record<string, string>;
    expect(flags.integrationGithub).toBe("false");
    expect(flags.integrationLinear).toBe("false");
    expect(flags.integrationSentry).toBe("false");
    expect(flags.integrationVercel).toBe("false");
    expect(flags.mobileMessageInput).toBe("default");
  });

  test("member can read flags", async () => {
    const res = await memberClient.api.workspaces[":slug"]["feature-flags"].$get({
      param: { slug: workspaceSlug },
    });
    expect(res.status).toBe(200);
    const flags = (await res.json()) as Record<string, string>;
    expect(flags.integrationGithub).toBe("false");
    expect(flags.mobileMessageInput).toBe("default");
  });

  test("workspace PATCH route is removed (404)", async () => {
    // Use raw fetch since the typed client no longer has $patch for this route
    const res = await fetch(`${getBaseUrl()}/api/workspaces/${workspaceSlug}/feature-flags`, {
      method: "PATCH",
      headers: {
        ...adminHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ integrationGithub: "true" }),
    });
    expect(res.status).toBe(404);
  });

  test("super-admin can GET feature flags via admin endpoint", async () => {
    const res = await superAdminClient.api.admin.workspaces[":workspaceId"]["feature-flags"].$get({
      param: { workspaceId },
    });
    expect(res.status).toBe(200);
    const flags = (await res.json()) as Record<string, string>;
    expect(flags.integrationGithub).toBe("false");
    expect(flags.mobileMessageInput).toBe("default");
  });

  test("super-admin can PATCH feature flags via admin endpoint", async () => {
    const res = await superAdminClient.api.admin.workspaces[":workspaceId"]["feature-flags"].$patch({
      param: { workspaceId },
      json: { integrationGithub: "true", integrationLinear: "true" },
    });
    expect(res.status).toBe(200);
    const flags = (await res.json()) as Record<string, string>;
    expect(flags.integrationGithub).toBe("true");
    expect(flags.integrationLinear).toBe("true");
    expect(flags.integrationSentry).toBe("false");
    expect(flags.integrationVercel).toBe("false");
  });

  test("super-admin can set variant flag", async () => {
    const res = await superAdminClient.api.admin.workspaces[":workspaceId"]["feature-flags"].$patch({
      param: { workspaceId },
      json: { mobileMessageInput: "variant-a" },
    });
    expect(res.status).toBe(200);
    const flags = (await res.json()) as Record<string, string>;
    expect(flags.mobileMessageInput).toBe("variant-a");

    // Verify it persists
    const getRes = await adminClient.api.workspaces[":slug"]["feature-flags"].$get({
      param: { slug: workspaceSlug },
    });
    const getFlags = (await getRes.json()) as Record<string, string>;
    expect(getFlags.mobileMessageInput).toBe("variant-a");
  });

  test("invalid flag value is rejected", async () => {
    const res = await superAdminClient.api.admin.workspaces[":workspaceId"]["feature-flags"].$patch({
      param: { workspaceId },
      json: { mobileMessageInput: "invalid-variant" },
    });
    expect(res.status).toBe(400);
  });

  test("unknown flag key is rejected", async () => {
    const res = await superAdminClient.api.admin.workspaces[":workspaceId"]["feature-flags"].$patch({
      param: { workspaceId },
      json: { nonExistentFlag: "value" },
    });
    expect(res.status).toBe(400);
  });

  test("super-admin can bulk update a feature flag", async () => {
    const res = await superAdminClient.api.admin["feature-flags"].bulk.$post({
      json: { flag: "integrationSentry", value: "true" },
    });
    expect(res.status).toBe(200);
    const result = (await res.json()) as Record<string, unknown>;
    expect(result.updated).toBeGreaterThan(0);

    // Verify it took effect on our workspace
    const flagsRes = await adminClient.api.workspaces[":slug"]["feature-flags"].$get({
      param: { slug: workspaceSlug },
    });
    const flags = (await flagsRes.json()) as Record<string, string>;
    expect(flags.integrationSentry).toBe("true");
  });

  test("non-admin cannot use admin feature flag endpoints", async () => {
    const res = await memberClient.api.admin.workspaces[":workspaceId"]["feature-flags"].$get({
      param: { workspaceId },
    });
    expect(res.status).toBe(403);
  });

  test("installing a gated integration fails (403) when flag is off", async () => {
    // Disable sentry flag via admin endpoint
    await superAdminClient.api.admin.workspaces[":workspaceId"]["feature-flags"].$patch({
      param: { workspaceId },
      json: { integrationSentry: "false" },
    });

    // Find sentry-bot listing
    const listRes = await adminClient.api.marketplace.$get({});
    const listings = (await listRes.json()) as Array<{ id: string; slug: string }>;
    const sentryListing = listings.find((l) => l.slug === "sentry-bot");
    expect(sentryListing).toBeDefined();

    const installRes = await adminClient.api.workspaces[":slug"].marketplace.install.$post({
      param: { slug: workspaceSlug },
      json: { listingId: sentryListing!.id },
    });
    expect(installRes.status).toBe(403);
  });

  test("installing succeeds when flag is on", async () => {
    // Enable github integration via admin endpoint
    await superAdminClient.api.admin.workspaces[":workspaceId"]["feature-flags"].$patch({
      param: { workspaceId },
      json: { integrationGithub: "true" },
    });

    // Find github-bot listing
    const listRes = await adminClient.api.marketplace.$get({});
    const listings = (await listRes.json()) as Array<{ id: string; slug: string }>;
    const ghListing = listings.find((l) => l.slug === "github-bot");
    expect(ghListing).toBeDefined();

    const installRes = await adminClient.api.workspaces[":slug"].marketplace.install.$post({
      param: { slug: workspaceSlug },
      json: { listingId: ghListing!.id },
    });
    expect(installRes.status).toBe(200);

    // Verify installed
    const installedRes = await adminClient.api.workspaces[":slug"].marketplace.installed.$get({
      param: { slug: workspaceSlug },
    });
    const installed = (await installedRes.json()) as { installedListingIds: string[] };
    expect(installed.installedListingIds).toContain(ghListing!.id);
  });
});
