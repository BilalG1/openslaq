#!/usr/bin/env bun
/**
 * Creates an isolated git worktree with a unique port prefix.
 *
 * Usage: bun run scripts/worktree-new.ts [name]
 */
import { $ } from "bun";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

const repoRoot = join(import.meta.dirname, "..");
const worktreesDir = join(repoRoot, ".worktrees");

function generateId(): string {
  return randomBytes(3).toString("hex"); // 6-char hex string
}

function getUsedPrefixes(): Set<number> {
  const used = new Set<number>();
  if (!existsSync(worktreesDir)) return used;

  for (const entry of readdirSync(worktreesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const envPath = join(worktreesDir, entry.name, ".env");
    if (!existsSync(envPath)) continue;
    const content = readFileSync(envPath, "utf-8");
    const match = content.match(/^PORT_PREFIX=(\d+)/m);
    if (match) used.add(parseInt(match[1]));
  }
  return used;
}

function pickPrefix(used: Set<number>): number {
  const candidates: number[] = [];
  for (let p = 31; p <= 80; p++) {
    if (!used.has(p)) candidates.push(p);
  }
  if (candidates.length === 0) {
    console.error("Error: No available port prefixes (31-80 all in use).");
    process.exit(1);
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function rewriteEnv(envContent: string, prefix: number): string {
  const prefixStr = String(prefix);

  // Add PORT_PREFIX at the top if not present, or replace existing
  let result: string;
  if (/^PORT_PREFIX=/m.test(envContent)) {
    result = envContent.replace(/^PORT_PREFIX=.*/m, `PORT_PREFIX=${prefixStr}`);
  } else {
    result = `PORT_PREFIX=${prefixStr}\n${envContent}`;
  }

  // Add COMPOSE_PROJECT_NAME
  if (/^COMPOSE_PROJECT_NAME=/m.test(result)) {
    result = result.replace(/^COMPOSE_PROJECT_NAME=.*/m, `COMPOSE_PROJECT_NAME=openslaq-${prefixStr}`);
  } else {
    result = result.replace(`PORT_PREFIX=${prefixStr}`, `PORT_PREFIX=${prefixStr}\nCOMPOSE_PROJECT_NAME=openslaq-${prefixStr}`);
  }

  // Replace all 30xx port references (where xx is 00-07) with {prefix}xx
  // Matches :30xx in URLs and = 30xx for bare port values like API_PORT=3001
  result = result.replace(/\b30(0[0-7])\b/g, `${prefixStr}$1`);

  return result;
}

function rewriteLivekitYaml(content: string, prefix: number): string {
  const prefixStr = String(prefix);
  return content.replace(/\b30(0[0-7])\b/g, `${prefixStr}$1`);
}

async function main() {
  const name = process.argv[2] || generateId();
  const worktreePath = join(worktreesDir, name);

  if (existsSync(worktreePath)) {
    console.error(`Error: Worktree "${name}" already exists at ${worktreePath}`);
    process.exit(1);
  }

  // Pick a unique prefix
  const used = getUsedPrefixes();
  const prefix = pickPrefix(used);
  const prefixStr = String(prefix);

  console.log(`Creating worktree "${name}" with port prefix ${prefixStr}...`);

  // Ensure .worktrees directory exists
  mkdirSync(worktreesDir, { recursive: true });

  // Create git worktree on a new branch based on HEAD
  const branch = `wt/${name}`;
  await $`git worktree add -b ${branch} ${worktreePath} HEAD`.cwd(repoRoot);

  // Generate .env
  const rootEnvPath = join(repoRoot, ".env");
  if (!existsSync(rootEnvPath)) {
    console.error("Error: No .env file found in repo root. Copy .env.example to .env first.");
    process.exit(1);
  }
  const rootEnv = readFileSync(rootEnvPath, "utf-8");
  const worktreeEnv = rewriteEnv(rootEnv, prefix);
  writeFileSync(join(worktreePath, ".env"), worktreeEnv);

  // Rewrite livekit.yaml webhook URL
  const livekitPath = join(worktreePath, "livekit.yaml");
  if (existsSync(livekitPath)) {
    const livekitContent = readFileSync(livekitPath, "utf-8");
    writeFileSync(livekitPath, rewriteLivekitYaml(livekitContent, prefix));
  }

  // Install dependencies
  console.log("Installing dependencies...");
  await $`bun install`.cwd(worktreePath);

  console.log("");
  console.log("=".repeat(60));
  console.log(`Worktree created: .worktrees/${name}`);
  console.log(`Port prefix:      ${prefixStr}`);
  console.log(`Ports:            ${prefixStr}00 (web), ${prefixStr}01 (api), ${prefixStr}02 (pg), ${prefixStr}03 (s3), ${prefixStr}04-06 (livekit)`);
  console.log("");
  console.log("Next steps:");
  console.log(`  cd .worktrees/${name}`);
  console.log("  docker compose up -d");
  console.log("  bun run --filter @openslaq/api db:migrate");
  console.log("  bun run --filter @openslaq/api db:seed");
  console.log("  bun run dev");
  console.log("=".repeat(60));
}

main();
