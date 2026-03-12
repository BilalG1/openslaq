import { hc } from "hono/client";
import type { AppType } from "@openslaq/api/app";
import { signTestJwt, type TestUser } from "@openslaq/test-utils";

export { signTestJwt };
export type { TestUser };

export function getBaseUrl() {
  return process.env.API_BASE_URL || "http://localhost:3001";
}

const defaultUser: TestUser = {
  id: "cli-e2e-user-001",
  displayName: "CLI E2E User",
  email: "cli-e2e@openslaq.dev",
  emailVerified: true,
};

export async function createTestClient(overrides?: Partial<TestUser>) {
  const user: TestUser = { ...defaultUser, ...overrides };
  const token = await signTestJwt(user);
  const headers = { Authorization: `Bearer ${token}` };
  const client = hc<AppType>(getBaseUrl(), { headers });
  return { client, headers, user };
}

export function testId(): string {
  return Math.random().toString(36).slice(2, 10);
}

const cleanupRegistry: { slug: string; client: ReturnType<typeof hc<AppType>> }[] = [];

export async function createTestWorkspace(client: ReturnType<typeof hc<AppType>>) {
  const res = await client.api.workspaces.$post({
    json: { name: `CLI Test ${testId()}` },
  });
  if (res.status !== 201) {
    throw new Error(`Failed to create test workspace: ${res.status}`);
  }
  const workspace = (await res.json()) as { id: string; name: string; slug: string };
  cleanupRegistry.push({ slug: workspace.slug, client });
  return workspace;
}

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
