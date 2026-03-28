import { test as base } from "@playwright/test";
import { ApiHelper, DEFAULT_USER, type ApiUser } from "./api";
import { collectCoverage } from "./coverage";

export interface TestWorkspace {
  name: string;
  slug: string;
  api: ApiHelper;
}

/** Create a workspace with retry logic, returns the server-generated name and slug. */
async function createWorkspaceWithRetry(name: string, token: ApiUser): Promise<{ name: string; slug: string; api: ApiHelper }> {
  // Use a temporary ApiHelper (slug doesn't matter for creation)
  const tempApi = new ApiHelper(token, "");
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const ws = await tempApi.createWorkspace(name);
      const api = new ApiHelper(token, ws.slug);
      return { name: ws.name, slug: ws.slug, api };
    } catch (error) {
      if (attempt === 6) throw error;
      await new Promise((r) => setTimeout(r, 750 * attempt));
    }
  }
  throw new Error("Failed to create workspace");
}

export const test = base.extend<{ testWorkspace: TestWorkspace }>({
page: async ({ page }, use, testInfo) => {
    await use(page);
    await collectCoverage(page, testInfo);
  },
  // eslint-disable-next-line no-empty-pattern
testWorkspace: async ({}, use) => {
    const name = `Test e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const { name: wsName, slug, api } = await createWorkspaceWithRetry(name, DEFAULT_USER);
    // #general is auto-created by the backend
    await api.createChannel("random");
    await use({ name: wsName, slug, api });
    // Clean up workspace after test to prevent accumulation
    await api.deleteWorkspace().catch(() => {});
  },
});

/**
 * Shared workspace variant — creates one workspace per worker (shared across tests in a file).
 * Use this for tests that don't perform destructive operations on the workspace.
 */
export const sharedTest = test.extend<{}, { _sharedWorkspace: TestWorkspace }>({
  _sharedWorkspace: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const name = `Test e2e-shared-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const { name: wsName, slug, api } = await createWorkspaceWithRetry(name, DEFAULT_USER);
      // #general is auto-created by the backend
      await api.createChannel("random");
      await use({ name: wsName, slug, api });
      // Clean up workspace after worker finishes to prevent accumulation
      await api.deleteWorkspace().catch(() => {});
    },
    { scope: "worker" },
  ],
testWorkspace: async ({ _sharedWorkspace }, use) => {
    await use(_sharedWorkspace);
  },
});

/** Create an ApiHelper for a second user targeting the same workspace. */
export function createSecondUserApi(slug: string, user: ApiUser): ApiHelper {
  return new ApiHelper(user, slug);
}

/** Invite a user to a workspace, join all channels, and return an authenticated ApiHelper.
 *  Handles the "already a member" case gracefully (safe for shared workspaces). */
export async function addMemberViaInvite(
  ownerApi: ApiHelper,
  user: ApiUser,
  slug: string,
): Promise<ApiHelper> {
  const api = new ApiHelper(user, slug);
  try {
    const invite = await ownerApi.createInvite();
    await api.acceptInvite(invite.code);
  } catch {
    // User may already be a member (e.g. shared workspace with parallel tests)
  }
  const channels = await api.getChannels();
  await Promise.all(channels.map((ch) => api.joinChannel(ch.id).catch(() => {})));
  return api;
}
