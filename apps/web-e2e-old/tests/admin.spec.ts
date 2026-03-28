import { expect } from "@playwright/test";
import { test } from "./helpers/coverage-fixture";
import { setupMockAuth } from "./helpers/mock-auth";

const MOCK_STATS = {
  users: 42,
  workspaces: 5,
  channels: 18,
  messages: 1234,
  attachments: 56,
  reactions: 789,
};

const MOCK_ACTIVITY = {
  messagesPerDay: [
    { date: "2026-02-18", count: 10 },
    { date: "2026-02-19", count: 25 },
    { date: "2026-02-20", count: 15 },
  ],
  usersPerDay: [
    { date: "2026-02-18", count: 2 },
    { date: "2026-02-19", count: 1 },
    { date: "2026-02-20", count: 3 },
  ],
};

const MOCK_USERS = {
  users: [
    {
      id: "user-1",
      displayName: "Alice",
      email: "alice@test.com",
      avatarUrl: null,
      lastSeenAt: "2026-02-20T10:00:00Z",
      createdAt: "2026-01-01T00:00:00Z",
      messageCount: 100,
      workspaceCount: 2,
    },
  ],
  total: 1,
  page: 1,
  pageSize: 20,
  totalPages: 1,
};

const MOCK_WORKSPACES = {
  workspaces: [
    {
      id: "ws-1",
      name: "Test Workspace",
      slug: "test-ws",
      createdAt: "2026-01-01T00:00:00Z",
      memberCount: 5,
      channelCount: 3,
      messageCount: 200,
    },
  ],
  total: 1,
  page: 1,
  pageSize: 20,
  totalPages: 1,
};

async function setupAdminMocks(page: import("@playwright/test").Page, isAdmin: boolean) {
  await page.route("**/api/admin/check", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ isAdmin }),
    }),
  );

  await page.route("**/api/admin/stats", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_STATS),
    }),
  );

  await page.route("**/api/admin/activity*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_ACTIVITY),
    }),
  );

  await page.route("**/api/admin/users*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_USERS),
    }),
  );

  await page.route("**/api/admin/workspaces*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_WORKSPACES),
    }),
  );
}

test.describe("Admin Dashboard", () => {
  test("non-admin is redirected away from /admin", async ({ page }) => {
    await setupMockAuth(page);
    await setupAdminMocks(page, false);
    await page.goto("/admin");
    await page.waitForURL("/", { timeout: 5000 });
    expect(page.url()).toMatch(/\/$/);
  });

  test("admin sees dashboard with all 4 tab links", async ({ page }) => {
    await setupMockAuth(page);
    await setupAdminMocks(page, true);
    await page.goto("/admin");

    await expect(page.getByText("Admin Dashboard")).toBeVisible();

    const tabs = page.getByTestId("admin-tabs");
    await expect(tabs.getByText("Overview")).toBeVisible();
    await expect(tabs.getByText("Users")).toBeVisible();
    await expect(tabs.getByText("Workspaces")).toBeVisible();
    await expect(tabs.getByText("Activity")).toBeVisible();
  });

  test("stats cards render with numbers", async ({ page }) => {
    await setupMockAuth(page);
    await setupAdminMocks(page, true);
    await page.goto("/admin");

    await expect(page.getByTestId("stat-users")).toContainText("42");
    await expect(page.getByTestId("stat-workspaces")).toContainText("5");
    await expect(page.getByTestId("stat-channels")).toContainText("18");
    await expect(page.getByTestId("stat-messages")).toContainText("1,234");
    await expect(page.getByTestId("stat-reactions")).toContainText("789");
  });

  test("tab navigation works", async ({ page }) => {
    await setupMockAuth(page);
    await setupAdminMocks(page, true);
    await page.goto("/admin");

    // Navigate to Users tab
    await page.getByTestId("admin-tabs").getByText("Users").click();
    await page.waitForURL("**/admin/users");
    await expect(
      page.getByPlaceholder("Search users by name or email..."),
    ).toBeVisible();

    // Navigate to Workspaces tab
    await page.getByTestId("admin-tabs").getByText("Workspaces").click();
    await page.waitForURL("**/admin/workspaces");
    await expect(
      page.getByPlaceholder("Search workspaces by name or slug..."),
    ).toBeVisible();

    // Navigate to Activity tab
    await page.getByTestId("admin-tabs").getByText("Activity").click();
    await page.waitForURL("**/admin/activity");
    await expect(page.getByText("30d")).toBeVisible();

    // Navigate back to Overview
    await page.getByTestId("admin-tabs").getByText("Overview").click();
    await page.waitForURL("**/admin");
    await expect(page.getByTestId("stat-users")).toBeVisible();
  });

  test("users tab renders user data in table", async ({ page }) => {
    await setupMockAuth(page);
    await setupAdminMocks(page, true);
    await page.goto("/admin");

    await page.getByTestId("admin-tabs").getByText("Users").click();
    await page.waitForURL("**/admin/users");

    // Verify table renders user data
    await expect(page.getByText("alice@test.com")).toBeVisible();
    await expect(page.getByText("Impersonate")).toBeVisible();
  });

  test("workspaces tab renders workspace data in table", async ({ page }) => {
    await setupMockAuth(page);
    await setupAdminMocks(page, true);
    await page.goto("/admin");

    await page.getByTestId("admin-tabs").getByText("Workspaces").click();
    await page.waitForURL("**/admin/workspaces");

    // Verify table renders workspace data
    await expect(page.getByText("Test Workspace")).toBeVisible();
    await expect(page.getByText("test-ws")).toBeVisible();
  });

  test("users tab search filters results", async ({ page }) => {
    await setupMockAuth(page);
    await setupAdminMocks(page, true);

    // Override users endpoint to respond differently based on search param
    await page.route("**/api/admin/users*", (route) => {
      const url = new URL(route.request().url());
      const search = url.searchParams.get("search");
      if (search) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            users: MOCK_USERS.users.filter((u) =>
              u.displayName.toLowerCase().includes(search.toLowerCase()) ||
              u.email.toLowerCase().includes(search.toLowerCase()),
            ),
            total: 0,
            page: 1,
            pageSize: 20,
            totalPages: 1,
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_USERS),
      });
    });

    await page.goto("/admin");
    await page.getByTestId("admin-tabs").getByText("Users").click();
    await page.waitForURL("**/admin/users");

    await expect(page.getByText("alice@test.com")).toBeVisible();

    // Type in search — after debounce, results should update
    await page.getByPlaceholder("Search users by name or email...").fill("alice");
    await expect(page.getByText("alice@test.com")).toBeVisible({ timeout: 5000 });
  });

  test("users tab pagination shows page controls", async ({ page }) => {
    await setupMockAuth(page);
    await setupAdminMocks(page, true);

    // Override users endpoint to have multiple pages
    await page.route("**/api/admin/users*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...MOCK_USERS,
          total: 40,
          totalPages: 2,
        }),
      }),
    );

    await page.goto("/admin");
    await page.getByTestId("admin-tabs").getByText("Users").click();
    await page.waitForURL("**/admin/users");

    // Pagination controls should be visible
    await expect(page.getByText("Page 1 of 2")).toBeVisible();
    await expect(page.getByRole("button", { name: "Previous" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Next" })).toBeEnabled();

    // Click Next
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Page 2 of 2")).toBeVisible();
  });

  test("workspaces tab search and pagination", async ({ page }) => {
    await setupMockAuth(page);
    await setupAdminMocks(page, true);

    // Override workspaces endpoint to have multiple pages
    await page.route("**/api/admin/workspaces*", (route) => {
      const url = new URL(route.request().url());
      const search = url.searchParams.get("search");
      if (search) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            workspaces: MOCK_WORKSPACES.workspaces.filter((w) =>
              w.name.toLowerCase().includes(search.toLowerCase()),
            ),
            total: 1,
            page: 1,
            pageSize: 20,
            totalPages: 1,
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...MOCK_WORKSPACES,
          total: 40,
          totalPages: 2,
        }),
      });
    });

    await page.goto("/admin");
    await page.getByTestId("admin-tabs").getByText("Workspaces").click();
    await page.waitForURL("**/admin/workspaces");

    await expect(page.getByText("Test Workspace")).toBeVisible();
    await expect(page.getByText("Page 1 of 2")).toBeVisible();

    // Click Next
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Page 2 of 2")).toBeVisible();

    // Search
    await page.getByPlaceholder("Search workspaces by name or slug...").fill("Test");
    await expect(page.getByText("Test Workspace")).toBeVisible({ timeout: 5000 });
  });

  test("activity tab range buttons work", async ({ page }) => {
    await setupMockAuth(page);
    await setupAdminMocks(page, true);
    await page.goto("/admin");

    await page.getByTestId("admin-tabs").getByText("Activity").click();
    await page.waitForURL("**/admin/activity");

    // 30d should be active by default
    await expect(page.getByText("Messages / Day")).toBeVisible();

    // Click 7d button
    await page.getByRole("button", { name: "7d" }).click();
    await expect(page.getByText("Messages / Day")).toBeVisible();

    // Click 90d button
    await page.getByRole("button", { name: "90d" }).click();
    await expect(page.getByText("Messages / Day")).toBeVisible();
  });

  test("impersonate button shows snippet dialog", async ({ page }) => {
    await setupMockAuth(page);
    await setupAdminMocks(page, true);

    await page.route("**/api/admin/impersonate/*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ snippet: "document.cookie = 'test-impersonate'" }),
      }),
    );

    await page.goto("/admin");
    await page.getByTestId("admin-tabs").getByText("Users").click();
    await page.waitForURL("**/admin/users");

    await expect(page.getByText("alice@test.com")).toBeVisible();
    await page.getByText("Impersonate").click();

    // Snippet dialog should appear
    await expect(page.getByText("Impersonation Snippet")).toBeVisible();
    await expect(page.getByText("document.cookie = 'test-impersonate'")).toBeVisible();

    // Click "Copy to Clipboard"
    await page.getByRole("button", { name: "Copy to Clipboard" }).click();
  });
});
