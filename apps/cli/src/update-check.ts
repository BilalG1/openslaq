import { join } from "node:path";
import { homedir } from "node:os";
import { VERSION } from "./version";

const CACHE_DIR = join(homedir(), ".openslaq");
const CACHE_FILE = join(CACHE_DIR, "update-check.json");
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const GITHUB_API_URL =
  "https://api.github.com/repos/bilalg1/openslaq/releases";

interface CacheEntry {
  checkedAt: number;
  latestVersion: string;
}

/** Compare two semver strings. Returns >0 if b is newer than a. */
export function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

async function readCache(): Promise<CacheEntry | null> {
  try {
    const text = await Bun.file(CACHE_FILE).text();
    return JSON.parse(text) as CacheEntry;
  } catch {
    return null;
  }
}

async function writeCache(entry: CacheEntry): Promise<void> {
  await Bun.write(CACHE_FILE, JSON.stringify(entry));
}

/** Fetch the latest CLI version, using cache when fresh. Returns null on failure. */
export async function fetchLatestVersion(): Promise<string | null> {
  const cached = await readCache();
  const now = Date.now();

  if (cached && now - cached.checkedAt < CACHE_TTL_MS) {
    return cached.latestVersion;
  }

  const res = await fetch(GITHUB_API_URL, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) return null;
  const releases = (await res.json()) as { tag_name: string }[];
  const cliRelease = releases.find((r) => r.tag_name.startsWith("cli-v"));
  if (!cliRelease) return null;
  const latest = cliRelease.tag_name.replace(/^cli-v/, "");
  await writeCache({ checkedAt: now, latestVersion: latest });
  return latest;
}

/**
 * Check GitHub releases for a newer version and print a warning to stderr.
 * Fire-and-forget — never throws, never blocks the CLI.
 */
export function checkForUpdate(): void {
  (async () => {
    const latest = await fetchLatestVersion();
    if (!latest) return;

    if (compareSemver(VERSION, latest) > 0) {
      console.error(
        `\nUpdate available: ${VERSION} → ${latest}\nRun \`curl -fsSL https://openslaq.com/install.sh | bash\` to update.\n`,
      );
    }
  })().catch(() => {
    // Silently ignore — never crash the CLI for an update check
  });
}
