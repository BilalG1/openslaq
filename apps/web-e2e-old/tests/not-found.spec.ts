import { expect } from "@playwright/test";
import { test } from "./helpers/coverage-fixture";

test("shows 404 page for unknown routes", async ({ page }) => {
  await page.goto("/some/nonexistent/page");
  await expect(page.getByText("404")).toBeVisible();
  await expect(page.getByText("Page not found")).toBeVisible();

  const homeLink = page.getByRole("link", { name: "Go home" });
  await expect(homeLink).toBeVisible();
  await expect(homeLink).toHaveAttribute("href", "/");
});
