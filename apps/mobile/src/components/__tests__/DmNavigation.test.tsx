import * as fs from "fs";
import * as path from "path";
import { routes } from "@/lib/routes";

/**
 * Route consistency tests.
 *
 * Navigation bugs are hard to catch in unit tests because the route string
 * only blows up at runtime ("page not found"). These tests enforce that every
 * router.push / router.replace call that builds a workspace-scoped route uses
 * the canonical `routes` helper from `@/lib/routes` instead of inline template
 * literals, so route mismatches are impossible.
 *
 * Static routes like "/(auth)/sign-in" or "/(app)/create-workspace" are
 * excluded because they have no dynamic segments and no matching helper.
 */

// Gather all .ts/.tsx source files under apps/mobile/{src,app}
function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== "__tests__") {
      results.push(...collectSourceFiles(full));
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

const mobileRoot = path.resolve(__dirname, "../../..");
const sourceFiles = [
  ...collectSourceFiles(path.join(mobileRoot, "src")),
  ...collectSourceFiles(path.join(mobileRoot, "app")),
];

// Match router.push(`...${...}...`) and router.replace(`...${...}...`)
// i.e. template literals with interpolations — these should use routes.* instead.
const INLINE_ROUTE_RE = /router\.(push|replace)\(\s*`[^`]*\$\{[^`]*`\s*\)/g;

// Collect violations: file + line + matched string
type Violation = { file: string; line: number; match: string };
const violations: Violation[] = [];

for (const file of sourceFiles) {
  const content = fs.readFileSync(file, "utf-8");
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const lineContent = lines[i]!;
    // Quick check before running the regex
    if (!lineContent.includes("router.")) continue;
    const matches = lineContent.match(INLINE_ROUTE_RE);
    if (matches) {
      for (const m of matches) {
        violations.push({
          file: path.relative(mobileRoot, file),
          line: i + 1,
          match: m.trim(),
        });
      }
    }
  }
}

describe("Route consistency — no inline workspace route strings", () => {
  it("all router.push/replace calls with dynamic segments should use routes helper", () => {
    // If this test fails, it lists every file:line where an inline template
    // literal route was used instead of the routes.* helper. Fix them by
    // importing `routes` from `@/lib/routes` and calling the appropriate helper.
    if (violations.length > 0) {
      const summary = violations
        .map((v) => `  ${v.file}:${v.line}  →  ${v.match}`)
        .join("\n");
      throw new Error(
        `Found ${violations.length} inline route string(s) that should use the routes helper:\n${summary}`,
      );
    }
  });
});

describe("routes helper coverage", () => {
  it("routes.dm() should produce a path matching an existing file-based route", () => {
    const dmRoute = routes.dm("ws", "ch-id");
    // The canonical DM route must go through (tabs)/(channels)/dm/
    expect(dmRoute).toContain("/(tabs)/(channels)/dm/");
  });

  it("routes.channel() should produce a path matching an existing file-based route", () => {
    const channelRoute = routes.channel("ws", "ch-id");
    expect(channelRoute).toContain("/(tabs)/(channels)/");
  });

  it("routes.browse() should produce a path matching an existing file-based route", () => {
    const browseRoute = routes.browse("ws");
    expect(browseRoute).toContain("/(tabs)/(channels)/browse");
  });
});
