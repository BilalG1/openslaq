import { expect } from "@playwright/test";
import { sharedTest, test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";

/** Open the invite dialog from the workspace sidebar dropdown. */
async function openInviteDialog(
  page: import("@playwright/test").Page,
  slug: string,
  name: string,
) {
  await setupMockAuth(page);
  await page.goto(`/w/${slug}`);
  await expect(page.getByText("# general")).toBeVisible();
  await page.locator("button", { hasText: name }).first().click();
  await page.getByRole("menuitem", { name: "Invite People" }).click();
  await expect(page.getByText("Invite People")).toBeVisible();
  const inviteInput = page.locator("input[readonly]");
  await expect(inviteInput).toBeVisible();
}

sharedTest.describe("Sidebar invite", () => {
  sharedTest("generate invite link via workspace dropdown and copy it", async ({ page, testWorkspace }) => {
    await openInviteDialog(page, testWorkspace.slug, testWorkspace.name);

    const inviteInput = page.locator("input[readonly]");
    const inviteValue = await inviteInput.inputValue();
    expect(inviteValue).toContain("/invite/");

    // Click "Copy Link" button
    await page.context().grantPermissions(["clipboard-write"]);
    await page.getByRole("button", { name: "Copy Link" }).click();

    // Verify button text changes to "Copied!"
    await expect(page.getByRole("button", { name: "Copied!" })).toBeVisible();
  });

  sharedTest("Generate New Link creates a different invite code", async ({ page, testWorkspace }) => {
    await openInviteDialog(page, testWorkspace.slug, testWorkspace.name);

    // Capture the first invite link
    const inviteInput = page.locator("input[readonly]");
    const firstLink = await inviteInput.inputValue();
    expect(firstLink).toContain("/invite/");

    // Click "Generate New Link"
    const newInvite = page.waitForResponse(
      (res) => res.url().includes("/invites") && res.request().method() === "POST" && res.status() === 201,
    );
    await page.getByRole("button", { name: "Generate New Link" }).click();
    await newInvite;

    // Verify the link changed
    const secondLink = await inviteInput.inputValue();
    expect(secondLink).toContain("/invite/");
    expect(secondLink).not.toEqual(firstLink);
  });
});

test.describe("Sidebar invite error", () => {
  test("shows error when invite API fails", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await expect(page.getByText("# general")).toBeVisible();

    // Mock the invites GET to return a 500 — set up before opening dialog
    await page.route("**/invites**", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal Server Error" }),
        });
      }
      return route.continue();
    });

    // Open invite dialog
    await page.locator("button", { hasText: testWorkspace.name }).first().click();
    await page.getByRole("menuitem", { name: "Invite People" }).click();

    // Error message should appear (getErrorMessage extracts the error field from the response)
    await expect(page.getByText("Internal Server Error")).toBeVisible();
  });
});
