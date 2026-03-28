import { expect } from "@playwright/test";
import { test } from "./fixtures";
import { setupMockAuth } from "./helpers/mock-auth";

test("app loads without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (text.includes("Failed to load resource")) return;
      errors.push(text);
    }
  });
  page.on("pageerror", (err) => {
    errors.push(err.message);
  });

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  expect(errors).toEqual([]);
});

test("authenticated user sees workspace with channels", async ({ page, testWorkspace }) => {
  await setupMockAuth(page);
  await page.goto(`/w/${testWorkspace.slug}`);

  // Sidebar shows channel list
  await expect(page.getByText("# general")).toBeVisible();
  await expect(page.getByText("# random")).toBeVisible();

  // Click into a channel — editor appears
  await page.getByText("# general").click();
  await expect(page.locator(".tiptap")).toBeVisible();
});
