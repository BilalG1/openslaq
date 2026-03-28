import { type Page } from "@playwright/test";
import { signTestJwt, PROJECT_ID, type TestUser } from "@openslaq/test-utils";

export type MockUser = TestUser;

const defaultUser: MockUser = {
  id: "e2e-test-user-001",
  displayName: "Test User",
  email: "test@openslaq.dev",
  emailVerified: true,
};

function buildStackAuthUserResponse(user: MockUser) {
  return {
    id: user.id,
    primary_email: user.email,
    primary_email_verified: user.emailVerified,
    display_name: user.displayName,
    client_metadata: {},
    client_read_only_metadata: {},
    selected_team: null,
    selected_team_id: null,
    profile_image_url: null,
    signed_up_at_millis: Date.now() - 86400000,
    has_password: false,
    auth_with_email: true,
    oauth_providers: [],
    auth_methods: [{ type: "otp", identifier: user.email }],
  };
}

function buildProjectResponse() {
  return {
    id: PROJECT_ID,
    display_name: "OpenSlaq",
    config: {
      sign_up_enabled: true,
      credential_enabled: true,
      magic_link_enabled: true,
      client_team_creation_enabled: false,
      client_user_deletion_enabled: false,
      oauth_providers: [],
      enabled_oauth_providers: [],
      domains: [],
    },
  };
}

function buildSessionResponse(user: MockUser) {
  return {
    id: `e2e-session-${user.id}`,
    project_id: PROJECT_ID,
    user_id: user.id,
    refresh_token_id: `e2e-refresh-${user.id}`,
    is_current: true,
    expires_at_millis: Date.now() + 60 * 60 * 1000,
    client_metadata: {},
  };
}

/**
 * Sets up mocked Stack Auth for e2e tests. Call before `page.goto()`.
 *
 * - Signs a test JWT using HMAC (accepted by backend when E2E_TEST_SECRET is set)
 * - Sets Stack Auth cookies so the SDK initializes as authenticated
 * - Intercepts all requests to api.stack-auth.com with mock responses
 */
export async function setupMockAuth(
  page: Page,
  overrides?: Partial<MockUser>,
): Promise<MockUser> {
  const user: MockUser = { ...defaultUser, ...overrides };
  const accessToken = await signTestJwt(user);
  const refreshPayload = JSON.stringify({
    refresh_token: `e2e-refresh-${user.id}`,
    updated_at_millis: Date.now(),
  });

  // Set Stack Auth cookies before navigating
  // Cookie names from SDK source: on HTTP localhost, no __Host- prefix
  await page.context().addCookies([
    {
      name: `stack-refresh-${PROJECT_ID}--default`,
      value: refreshPayload,
      domain: "localhost",
      path: "/",
    },
    {
      name: "stack-access",
      value: JSON.stringify([`e2e-refresh-${user.id}`, accessToken]),
      domain: "localhost",
      path: "/",
    },
  ]);

  // Re-apply auth cookies on each document load; some SDK flows clear cookies.
  await page.addInitScript(
    ({ projectId, refreshCookieValue, signedAccessToken, userId }) => {
      document.cookie = `stack-refresh-${projectId}--default=${refreshCookieValue}; path=/`;
      document.cookie = `stack-access=${JSON.stringify([`e2e-refresh-${userId}`, signedAccessToken])}; path=/`;
    },
    {
      projectId: PROJECT_ID,
      refreshCookieValue: refreshPayload,
      signedAccessToken: accessToken,
      userId: user.id,
    },
  );

  // Intercept all Stack Auth API requests
  await page.route("**/api.stack-auth.com/**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    // Token refresh / OAuth token exchange endpoints
    if (
      (url.includes("/auth/sessions/current/refresh") ||
        url.includes("/auth/oauth/token")) &&
      method === "POST"
    ) {
      // oauth4webapi requires a proper OAuth2 token response
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: accessToken,
          token_type: "bearer",
          expires_in: 3600,
          refresh_token: `e2e-refresh-${user.id}`,
        }),
      });
    }

    // Current user endpoint
    if (url.includes("/users/me") && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildStackAuthUserResponse(user)),
      });
    }

    // User profile update endpoint used by user settings tests
    if (url.includes("/users/me") && method === "PATCH") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildStackAuthUserResponse(user)),
      });
    }

    // Project config endpoint
    if (url.includes("/projects/current") && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildProjectResponse()),
      });
    }

    // Session management endpoints used by Stack SDK to decide auth state
    if (url.includes("/auth/sessions/current") && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildSessionResponse(user)),
      });
    }
    if (url.includes("/auth/sessions/current") && method === "DELETE") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    }

    // Catch-all: return 200 with empty object
    console.warn(`[mock-auth] Unhandled Stack Auth request: ${method} ${url}`);
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });

  return user;
}
