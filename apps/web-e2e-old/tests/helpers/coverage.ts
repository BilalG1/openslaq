import type { Page, TestInfo } from "@playwright/test";

export async function collectCoverage(page: Page, testInfo: TestInfo): Promise<void> {
  if (process.env.VITE_COVERAGE !== "true") return;

  const coverage = await page.evaluate(() => (globalThis as Record<string, unknown>).__coverage__);
  if (!coverage) return;

  const { writeFileSync, mkdirSync } = await import("node:fs");
  const { resolve } = await import("node:path");
  const dir = resolve("coverage-raw");
  mkdirSync(dir, { recursive: true });
  const safe = testInfo.title.replace(/[^a-zA-Z0-9_-]/g, "_");
  writeFileSync(resolve(dir, `${safe}-${Date.now()}.json`), JSON.stringify(coverage));
}
