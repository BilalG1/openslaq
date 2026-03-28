import { expect } from "@playwright/test";
import { sharedTest as test, addMemberViaInvite } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";
import { SECOND_USER } from "./helpers/api";

test.describe("Channel Members", () => {
  test("member count is visible in channel header", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    await expect(page.getByTestId("channel-member-count")).toBeVisible();
  });

  test("dialog opens when clicking member count", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    await page.getByTestId("channel-member-count").click();
    await expect(page.getByRole("heading", { name: "Channel Members" })).toBeVisible();
  });

  test("dialog shows member name and email", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    await page.getByTestId("channel-member-count").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Channel Members" })).toBeVisible();
    await expect(dialog.getByText("Test User")).toBeVisible();
    await expect(dialog.getByText("test@openslaq.dev")).toBeVisible();
  });

  test("search filters members", async ({ page, testWorkspace }) => {
    // Add a second user
    await addMemberViaInvite(testWorkspace.api, SECOND_USER, testWorkspace.slug);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    await page.getByTestId("channel-member-count").click();
    await expect(page.getByRole("heading", { name: "Channel Members" })).toBeVisible();

    // Both users should appear initially
    await expect(page.getByTestId(`channel-member-e2e-test-user-001`)).toBeVisible();
    await expect(page.getByTestId(`channel-member-e2e-test-user-002`)).toBeVisible();

    // Type to filter
    await page.getByTestId("member-search-input").fill("Second");
    await expect(page.getByTestId(`channel-member-e2e-test-user-002`)).toBeVisible();
    await expect(page.getByTestId(`channel-member-e2e-test-user-001`)).not.toBeVisible();
  });

  test("clicking member opens profile sidebar", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    await page.getByTestId("channel-member-count").click();
    await expect(page.getByRole("heading", { name: "Channel Members" })).toBeVisible();

    // Click on the member
    await page.getByTestId("channel-member-e2e-test-user-001").click();

    // Dialog should close and profile sidebar should open
    await expect(page.getByRole("heading", { name: "Channel Members" })).not.toBeVisible();
    await expect(page.getByTestId("profile-sidebar")).toBeVisible();
  });
});
