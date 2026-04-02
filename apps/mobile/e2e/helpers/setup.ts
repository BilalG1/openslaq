import * as fs from "fs";
import * as path from "path";
import { by, device, element, waitFor } from "detox";
import { signTestJwt, createTestWorkspace, defaultUser, type TestUser } from "./api";

const RESULTS_DIR = path.join(__dirname, "..", "test-results");

/** Take a screenshot and save it flat at e2e/test-results/<name>.png */
export async function screenshot(name: string): Promise<string> {
  const tmpPath = await device.takeScreenshot(name);
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const dest = path.join(RESULTS_DIR, `${name}.png`);
  fs.copyFileSync(tmpPath, dest);
  return dest;
}

/** Remove old flat screenshots (keeps .detox-artifacts untouched). */
export function cleanScreenshots(): void {
  if (!fs.existsSync(RESULTS_DIR)) return;
  for (const f of fs.readdirSync(RESULTS_DIR)) {
    if (f.endsWith(".png")) fs.unlinkSync(path.join(RESULTS_DIR, f));
  }
}

/**
 * Creates auth credentials and a workspace, then launches the app.
 * Returns the token and workspace for use in tests and cleanup.
 */
export async function launchAppWithAuth(
  user: TestUser = defaultUser,
): Promise<{ token: string; workspace: { id: string; name: string; slug: string } }> {
  const token = await signTestJwt(user);
  const workspace = await createTestWorkspace(token);

  await launchApp(token, user.id, workspace.slug);

  return { token, workspace };
}

/**
 * Launches the app with existing auth credentials and waits for the channel list.
 * Use this when you need to set up test data between workspace creation and app launch.
 */
export async function launchApp(
  token: string,
  userId: string,
  workspaceSlug: string,
): Promise<void> {
  await device.launchApp({
    newInstance: true,
    permissions: { notifications: "YES" },
    launchArgs: {
      detoxTestToken: token,
      detoxTestUserId: userId,
      detoxWorkspaceSlug: workspaceSlug,
      detoxEnableSynchronization: 0,
    },
  });

  await device.setURLBlacklist([".*socket\\.io.*"]);
  await device.enableSynchronization();

  // Wait for the app to fully bootstrap and show the channel list.
  // The first launch in a test run can take 20-30s due to simulator warmup.
  await waitFor(element(by.id("channel-list")))
    .toBeVisible()
    .withTimeout(30000);
}
