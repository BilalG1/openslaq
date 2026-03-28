import { test as base } from "@playwright/test";
import { ApiHelper, DEFAULT_USER, SECOND_USER, type ApiUser } from "./helpers/api";

export interface TestWorkspace {
  name: string;
  slug: string;
  api: ApiHelper;
}

/** Create a workspace with retry logic. */
async function createWorkspaceWithRetry(name: string, user: ApiUser): Promise<{ name: string; slug: string; api: ApiHelper }> {
  const tempApi = new ApiHelper(user, "");
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const ws = await tempApi.createWorkspace(name);
      const api = new ApiHelper(user, ws.slug);
      return { name: ws.name, slug: ws.slug, api };
    } catch (error) {
      if (attempt === 6) throw error;
      await new Promise((r) => setTimeout(r, 750 * attempt));
    }
  }
  throw new Error("Failed to create workspace");
}

/**
 * Per-worker shared workspace fixture.
 * Each worker gets one workspace shared across all tests in the file.
 * Use this for most tests — it's fast because setup happens once per worker.
 */
export const test = base.extend<{ testWorkspace: TestWorkspace }, { _sharedWorkspace: TestWorkspace }>({
  _sharedWorkspace: [
    // eslint-disable-next-line no-empty-pattern
async ({}, use) => {
      const name = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const { name: wsName, slug, api } = await createWorkspaceWithRetry(name, DEFAULT_USER);
      await api.createChannel("random");
      await use({ name: wsName, slug, api });
      await api.deleteWorkspace().catch(() => {});
    },
    { scope: "worker" },
  ],
testWorkspace: async ({ _sharedWorkspace }, use) => {
    await use(_sharedWorkspace);
  },
});

/**
 * Per-test workspace fixture for tests that mutate workspace state.
 * Creates a fresh workspace for each test and cleans up after.
 */
export const isolatedTest = base.extend<{ testWorkspace: TestWorkspace }>({
  // eslint-disable-next-line no-empty-pattern
testWorkspace: async ({}, use) => {
    const name = `e2e-iso-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const { name: wsName, slug, api } = await createWorkspaceWithRetry(name, DEFAULT_USER);
    await api.createChannel("random");
    await use({ name: wsName, slug, api });
    await api.deleteWorkspace().catch(() => {});
  },
});

/** Invite a user to a workspace and return an authenticated ApiHelper. */
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
    // User may already be a member (shared workspace)
  }
  const channels = await api.getChannels();
  await Promise.all(channels.map((ch) => api.joinChannel(ch.id).catch(() => {})));
  return api;
}

export { DEFAULT_USER, SECOND_USER };
export type { ApiUser };
