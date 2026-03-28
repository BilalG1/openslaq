import { expect } from "@playwright/test";
import { test } from "./helpers/coverage-fixture";

test("app loads without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      // Ignore browser-initiated favicon 404 — not an app error
      if (text.includes("Failed to load resource")) return;
      errors.push(text);
    }
  });
  page.on("pageerror", (err) => {
    errors.push(err.message);
  });

  await page.goto("/");
  // Wait for page to settle (workspace list or auth redirect)
  await page.waitForLoadState("networkidle");

  expect(errors).toEqual([]);
});
