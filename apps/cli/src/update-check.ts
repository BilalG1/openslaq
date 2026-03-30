import { join } from "node:path";
import { homedir } from "node:os";
import { VERSION } from "./version";

const CACHE_DIR = join(homedir(), ".openslaq");
const CACHE_FILE = join(CACHE_DIR, "update-check.json");
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const GITHUB_API_URL =
  "https://api.github.com/repos/bilalg1/openslaq/releases/latest";

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

/**
 * Check GitHub releases for a newer version and print a warning to stderr.
 * Fire-and-forget — never throws, never blocks the CLI.
 */
export function checkForUpdate(): void {
  (async () => {
    const cached = await readCache();
    const now = Date.now();

    let latest: string;
    if (cached && now - cached.checkedAt < CACHE_TTL_MS) {
      latest = cached.latestVersion;
    } else {
      const res = await fetch(GITHUB_API_URL, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { tag_name: string };
      // tag format: cli-v1.2.3 → extract version
      latest = data.tag_name.replace(/^cli-v/, "");
      await writeCache({ checkedAt: now, latestVersion: latest });
    }

    if (compareSemver(VERSION, latest) > 0) {
      console.error(
        `\nUpdate available: ${VERSION} → ${latest}\nRun \`curl -fsSL https://openslaq.com/install.sh | bash\` to update.\n`,
      );
    }
  })().catch(() => {
    // Silently ignore — never crash the CLI for an update check
  });
}
