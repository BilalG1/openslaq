import { expect } from "@playwright/test";
import { test } from "./helpers/coverage-fixture";

test("desktop download page shows platform options", async ({ page }) => {
  await page.goto("/desktop");

  await expect(page.getByRole("heading", { name: "OpenSlaq Desktop" })).toBeVisible();

  const macosButton = page.getByTestId("desktop-download-macos");
  await expect(macosButton).toBeVisible();
  await expect(macosButton).toHaveAttribute(
    "href",
    "https://github.com/openslaq/openslaq/releases/latest",
  );

  const windowsButton = page.getByTestId("desktop-download-windows");
  await expect(windowsButton).toBeVisible();
  await expect(windowsButton).toBeDisabled();

  const linuxButton = page.getByTestId("desktop-download-linux");
  await expect(linuxButton).toBeVisible();
  await expect(linuxButton).toBeDisabled();
});
