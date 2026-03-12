import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { TOKEN_FILE } from "../config";

export interface StoredTokens {
  refreshToken: string;
  accessToken: string;
  apiKey?: string;
}

export async function saveTokens(
  tokens: StoredTokens,
  filePath = TOKEN_FILE,
): Promise<void> {
  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await writeFile(filePath, JSON.stringify(tokens, null, 2) + "\n", {
    mode: 0o600,
  });
}

export async function loadTokens(
  filePath = TOKEN_FILE,
): Promise<StoredTokens | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as StoredTokens;
    if (parsed.apiKey || (parsed.refreshToken && parsed.accessToken)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function clearTokens(filePath = TOKEN_FILE): Promise<void> {
  try {
    await unlink(filePath);
  } catch {
    // File doesn't exist — nothing to clear.
  }
}
