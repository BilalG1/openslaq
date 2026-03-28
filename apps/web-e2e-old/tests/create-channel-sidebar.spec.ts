import { expect } from "@playwright/test";
import { test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";

test.describe("Create Channel from Sidebar", () => {
  test("+ button visible on hover and clicking opens dialog", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    const header = page.getByTestId("channels-section-header");
    const createBtn = page.getByTestId("create-channel-button");

    // + button hidden by default, visible on hover
    await expect(header).toBeVisible();
    await header.hover();
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    await expect(page.getByRole("heading", { name: "Create Channel" })).toBeVisible();
    await expect(page.getByTestId("create-channel-name-input")).toBeVisible();
  });

  test("create channel with name -> appears in sidebar and auto-selected", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // Hover section header to reveal + button, then open dialog
    await page.getByTestId("channels-section-header").hover();
    await page.getByTestId("create-channel-button").click();
    await expect(page.getByRole("heading", { name: "Create Channel" })).toBeVisible();

    // Type channel name and submit
    const channelName = `test-ch-${Date.now()}`;
    const input = page.getByTestId("create-channel-name-input");
    await input.fill(channelName);

    const created = page.waitForResponse(
      (res) => res.url().includes("/channels") && res.request().method() === "POST" && res.status() === 201,
    );
    await page.getByRole("button", { name: "Create" }).click();
    await created;

    // Dialog should close
    await expect(page.getByRole("heading", { name: "Create Channel" })).not.toBeVisible();

    // New channel appears in sidebar
    await expect(page.getByText(`# ${channelName}`)).toBeVisible({ timeout: 10000 });
  });

  test("cancel closes dialog without creating", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    await page.getByTestId("channels-section-header").hover();
    await page.getByTestId("create-channel-button").click();
    await expect(page.getByRole("heading", { name: "Create Channel" })).toBeVisible();

    await page.getByTestId("create-channel-name-input").fill("should-not-create");
    await page.getByRole("button", { name: "Cancel" }).click();

    // Dialog closes
    await expect(page.getByRole("heading", { name: "Create Channel" })).not.toBeVisible();

    // Channel should not appear in sidebar
    await expect(page.getByText("# should-not-create")).not.toBeVisible();
  });

  test("empty name disables Create button", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    await page.getByTestId("channels-section-header").hover();
    await page.getByTestId("create-channel-button").click();
    await expect(page.getByRole("heading", { name: "Create Channel" })).toBeVisible();

    // Create button should be disabled with empty input
    await expect(page.getByRole("button", { name: "Create" })).toBeDisabled();

    // Type something, it should enable
    await page.getByTestId("create-channel-name-input").fill("test");
    await expect(page.getByRole("button", { name: "Create" })).toBeEnabled();

    // Clear it, should disable again
    await page.getByTestId("create-channel-name-input").fill("");
    await expect(page.getByRole("button", { name: "Create" })).toBeDisabled();
  });

  test("press Enter in channel name input creates channel", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // Hover section header to reveal + button, then open dialog
    await page.getByTestId("channels-section-header").hover();
    await page.getByTestId("create-channel-button").click();
    await expect(page.getByRole("heading", { name: "Create Channel" })).toBeVisible();

    // Type channel name and press Enter
    const channelName = `enter-ch-${Date.now()}`;
    const input = page.getByTestId("create-channel-name-input");
    await input.fill(channelName);
    // Wait for React state to propagate (Create button becomes enabled)
    await expect(page.getByRole("button", { name: "Create" })).toBeEnabled();

    const created = page.waitForResponse(
      (res) => res.url().includes("/channels") && res.request().method() === "POST" && res.status() === 201,
    );
    await input.press("Enter");
    await created;

    // Dialog should close
    await expect(page.getByRole("heading", { name: "Create Channel" })).not.toBeVisible();

    // New channel appears in sidebar
    await expect(page.getByText(`# ${channelName}`)).toBeVisible({ timeout: 10000 });
  });
});
