import { test as base } from "@playwright/test";
import { collectCoverage } from "./coverage";

/** Extends base Playwright test with coverage collection on page teardown. */
export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    await use(page);
    await collectCoverage(page, testInfo);
  },
});
