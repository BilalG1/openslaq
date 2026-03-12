import { hc } from "hono/client";
import type { AppType } from "@openslaq/api/app";
import { signTestJwt, type TestUser } from "@openslaq/test-utils";

export { signTestJwt };
export type { TestUser };

export type TestApiClient = ReturnType<typeof hc<AppType>>;

export function getBaseUrl() {
  return process.env.API_BASE_URL || "http://localhost:3001";
}

const defaultUser: TestUser = {
  id: "api-e2e-user-001",
  displayName: "API E2E User",
  email: "api-e2e@openslaq.dev",
  emailVerified: true,
};

export async function createTestClient(overrides?: Partial<TestUser>) {
  const user: TestUser = { ...defaultUser, ...overrides };
  const token = await signTestJwt(user);
  const headers = { Authorization: `Bearer ${token}` };
  const client = hc<AppType>(getBaseUrl(), { headers });
  return { client, headers, user };
}

/** Short random string for unique test data */
export function testId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Cleanup registry: tracks workspaces to delete after all tests complete
const cleanupRegistry: { slug: string; client: TestApiClient }[] = [];

/** Create an isolated workspace for testing, returns the workspace and slug.
 *  Automatically registers the workspace for cleanup after tests complete. */
export async function createTestWorkspace(client: TestApiClient) {
  const res = await client.api.workspaces.$post({
    json: { name: `Test Workspace ${testId()}` },
  });
  if (res.status !== 201) {
    throw new Error(`Failed to create test workspace: ${res.status}`);
  }
  const workspace = (await res.json()) as { id: string; name: string; slug: string };
  cleanupRegistry.push({ slug: workspace.slug, client });
  return workspace;
}

/** Delete all workspaces created during this test run. Called from setup.ts afterAll. */
export async function cleanupTestWorkspaces() {
  const results = await Promise.allSettled(
    cleanupRegistry.map(({ slug, client }) =>
      client.api.workspaces[":slug"].$delete({ param: { slug } }),
    ),
  );
  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length > 0) {
    console.warn(`[cleanup] Failed to delete ${failures.length}/${cleanupRegistry.length} workspaces`);
  }
  cleanupRegistry.length = 0;
}

/** Add a user to a workspace via invite flow */
export async function addToWorkspace(
  ownerClient: TestApiClient,
  slug: string,
  joinerClient: TestApiClient,
) {
  const inviteRes = await ownerClient.api.workspaces[":slug"].invites.$post({
    param: { slug },
    json: {},
  });
  if (inviteRes.status !== 201) {
    throw new Error(`Failed to create invite: ${inviteRes.status}`);
  }
  const invite = (await inviteRes.json()) as { code: string };

  const acceptRes = await joinerClient.api.invites[":code"].accept.$post({
    param: { code: invite.code },
  });
  if (acceptRes.status !== 200) {
    throw new Error(`Failed to accept invite: ${acceptRes.status}`);
  }
}
