import { join, resolve } from "node:path";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { signTestJwt, type TestUser } from "@openslaq/test-utils";

const CLI_ENTRY = resolve(import.meta.dir, "../../src/index.ts");

export function getBaseUrl() {
  return process.env.API_BASE_URL || "http://localhost:3001";
}

export function testId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/** Spawn the CLI as a subprocess and capture output. */
export async function runCli(
  args: string[],
  env?: Record<string, string>,
): Promise<CliResult> {
  const outFile = join(tmpdir(), `openslaq-cli-stdout-${Math.random().toString(36).slice(2)}`);
  const errFile = join(tmpdir(), `openslaq-cli-stderr-${Math.random().toString(36).slice(2)}`);

  const proc = Bun.spawn({
    cmd: ["bun", CLI_ENTRY, ...args],
    cwd: resolve(import.meta.dir, "../.."),
    env: { ...process.env, ...env },
    stdout: Bun.file(outFile),
    stderr: Bun.file(errFile),
  });
  const exitCode = await proc.exited;

  let stdout = "";
  let stderr = "";
  try {
    stdout = await Bun.file(outFile).text();
  } catch { /* empty */ }
  try {
    stderr = await Bun.file(errFile).text();
  } catch { /* empty */ }

  // Clean up temp files
  try { await rm(outFile); } catch { /* ignore */ }
  try { await rm(errFile); } catch { /* ignore */ }

  return { stdout, stderr, exitCode };
}

/** Create a temp directory with a pre-seeded auth.json containing a signed test JWT. */
export async function createAuthEnv(
  user?: Partial<TestUser>,
): Promise<{ tokenFile: string; tempDir: string; env: Record<string, string> }> {
  const tempDir = await mkdtemp(join(tmpdir(), "openslaq-cli-e2e-"));
  const tokenFile = join(tempDir, "auth.json");

  const testUser: TestUser = {
    id: user?.id ?? `cli-e2e-${testId()}`,
    displayName: user?.displayName ?? "CLI E2E User",
    email: user?.email ?? `cli-e2e-${testId()}@openslaq.dev`,
    emailVerified: user?.emailVerified ?? true,
  };

  const accessToken = await signTestJwt(testUser);
  await mkdir(tempDir, { recursive: true });
  await writeFile(
    tokenFile,
    JSON.stringify({ refreshToken: "fake-rt", accessToken }) + "\n",
  );

  return {
    tokenFile,
    tempDir,
    env: {
      OPENSLAQ_TOKEN_FILE: tokenFile,
      OPENSLAQ_API_URL: getBaseUrl(),
      // Point Stack Auth refresh at a non-existent URL so fallback to existing token kicks in
      OPENSLAQ_STACK_AUTH_BASE: "http://localhost:19999",
    },
  };
}

export async function cleanupAuthEnv(tempDir: string): Promise<void> {
  await rm(tempDir, { recursive: true, force: true });
}
