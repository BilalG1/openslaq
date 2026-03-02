#!/usr/bin/env bun
/**
 * Tears down an isolated git worktree and its Docker services.
 *
 * Usage: bun run scripts/worktree-rm.ts <name>
 */
import { $ } from "bun";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dirname, "..");
const worktreesDir = join(repoRoot, ".worktrees");

function listWorktrees(): string[] {
  if (!existsSync(worktreesDir)) return [];
  return readdirSync(worktreesDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

function getPrefix(worktreePath: string): string | null {
  const envPath = join(worktreePath, ".env");
  if (!existsSync(envPath)) return null;
  const content = readFileSync(envPath, "utf-8");
  const match = content.match(/^PORT_PREFIX=(\d+)/m);
  return match ? match[1] : null;
}

async function main() {
  let name = process.argv[2];

  if (!name) {
    const available = listWorktrees();
    if (available.length === 0) {
      console.log("No worktrees found in .worktrees/");
      process.exit(0);
    }
    console.log("Available worktrees:");
    for (const wt of available) {
      const prefix = getPrefix(join(worktreesDir, wt));
      console.log(`  ${wt}${prefix ? ` (prefix ${prefix})` : ""}`);
    }
    console.error("\nUsage: bun run wt:rm <name>");
    process.exit(1);
  }

  const worktreePath = join(worktreesDir, name);
  if (!existsSync(worktreePath)) {
    console.error(`Error: Worktree "${name}" not found at ${worktreePath}`);
    process.exit(1);
  }

  const prefix = getPrefix(worktreePath);

  // Stop Docker services
  if (prefix) {
    const projectName = `openslaq-${prefix}`;
    console.log(`Stopping Docker services (${projectName})...`);
    await $`docker compose -p ${projectName} down -v`.cwd(worktreePath).nothrow();
  }

  // Kill dev processes on prefix ports
  if (prefix) {
    const webPort = `${prefix}00`;
    const apiPort = `${prefix}01`;
    console.log(`Killing processes on ports ${webPort}, ${apiPort}...`);
    await $`lsof -ti :${webPort} -i :${apiPort} | xargs kill 2>/dev/null`.nothrow();
  }

  // Remove git worktree
  console.log(`Removing worktree .worktrees/${name}...`);
  await $`git worktree remove ${worktreePath} --force`.cwd(repoRoot);

  console.log(`Worktree "${name}" removed.`);
}

main();
