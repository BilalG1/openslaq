import { describe, test, expect, beforeAll } from "bun:test";
import * as jose from "jose";
import {
  createTestClient,
  createTestWorkspace,
  addToWorkspace,
  testId,
  getBaseUrl,
} from "./helpers/api-client";
import {
  E2E_TEST_SECRET,
  ISSUER,
  PROJECT_ID,
} from "@openslaq/test-utils";
import {
  checkRateLimit,
  setEnabled,
  resetStore,
} from "../../api/src/rate-limit/store";

// ---------------------------------------------------------------------------
// 1. Privilege escalation — member cannot self-promote
// ---------------------------------------------------------------------------
describe("privilege escalation", () => {
  test("member cannot self-promote to admin → 403", async () => {
    const uid = testId();
    const { client: ownerClient } = await createTestClient({
      id: `pe-owner-${uid}`,
      email: `pe-owner-${uid}@openslaq.dev`,
    });
    const ws = await createTestWorkspace(ownerClient);

    const memberId = `pe-member-${uid}`;
    const { client: memberClient } = await createTestClient({
      id: memberId,
      email: `pe-member-${uid}@openslaq.dev`,
    });
    await addToWorkspace(ownerClient, ws.slug, memberClient);

    const res =
      await memberClient.api.workspaces[":slug"].members[":userId"].role.$patch(
        {
          param: { slug: ws.slug, userId: memberId },
          json: { role: "admin" },
        },
      );
    expect(res.status as number).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// 2. Admin endpoint access — non-admin rejection
// ---------------------------------------------------------------------------
describe("admin endpoints — non-admin rejection", () => {
  let headers: Record<string, string>;

  beforeAll(async () => {
    const uid = testId();
    const ctx = await createTestClient({
      id: `non-admin-${uid}`,
      email: `non-admin-${uid}@openslaq.dev`,
    });
    headers = ctx.headers;
  });

  test("POST /admin/impersonate/:userId → 403", async () => {
    const res = await fetch(
      `${getBaseUrl()}/api/admin/impersonate/some-user-id`,
      { method: "POST", headers },
    );
    expect(res.status).toBe(403);
  });

  test("GET /admin/activity → 403", async () => {
    const res = await fetch(
      `${getBaseUrl()}/api/admin/activity?days=7`,
      { headers },
    );
    expect(res.status).toBe(403);
  });

  test("GET /admin/users → 403", async () => {
    const res = await fetch(
      `${getBaseUrl()}/api/admin/users?page=1&pageSize=5`,
      { headers },
    );
    expect(res.status).toBe(403);
  });

  test("GET /admin/workspaces → 403", async () => {
    const res = await fetch(
      `${getBaseUrl()}/api/admin/workspaces?page=1&pageSize=5`,
      { headers },
    );
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// 3. JWT expiry enforcement
// ---------------------------------------------------------------------------
describe("JWT expiry enforcement", () => {
  test("expired JWT → 401", async () => {
    const secret = new TextEncoder().encode(E2E_TEST_SECRET);
    const now = Math.floor(Date.now() / 1000);
    const token = await new jose.SignJWT({
      email: "expired@test.dev",
      name: "Expired User",
      email_verified: true,
      project_id: PROJECT_ID,
      branch_id: "main",
      refresh_token_id: "e2e-rt-expired",
      role: "authenticated",
      selected_team_id: null,
      is_anonymous: false,
      is_restricted: false,
      restricted_reason: null,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("expired-user-001")
      .setIssuer(ISSUER)
      .setAudience(PROJECT_ID)
      .setIssuedAt(now - 7200)
      .setExpirationTime(now - 3600)
      .sign(secret);

    const res = await fetch(`${getBaseUrl()}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 4. API key cross-user PATCH and DELETE
// ---------------------------------------------------------------------------
describe("API key cross-user mutation", () => {
  let headersA: Record<string, string>;
  let headersB: Record<string, string>;
  let keyId: string;

  beforeAll(async () => {
    const uidA = testId();
    const ctxA = await createTestClient({
      id: `apikey-xa-${uidA}`,
      email: `apikey-xa-${uidA}@openslaq.dev`,
    });
    headersA = ctxA.headers;

    const uidB = testId();
    const ctxB = await createTestClient({
      id: `apikey-xb-${uidB}`,
      email: `apikey-xb-${uidB}@openslaq.dev`,
    });
    headersB = ctxB.headers;

    // User A creates a key
    const createRes = await fetch(`${getBaseUrl()}/api/api-keys`, {
      method: "POST",
      headers: { ...headersA, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Cross User Key", scopes: ["chat:read"] }),
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { id: string };
    keyId = created.id;
  });

  test("user B cannot PATCH user A's API key → 404", async () => {
    const res = await fetch(`${getBaseUrl()}/api/api-keys/${keyId}`, {
      method: "PATCH",
      headers: { ...headersB, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Hijacked Key" }),
    });
    expect(res.status).toBe(404);
  });

  test("user B cannot DELETE user A's API key → 404", async () => {
    const res = await fetch(`${getBaseUrl()}/api/api-keys/${keyId}`, {
      method: "DELETE",
      headers: headersB,
    });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// 5. Rate limiting — store-level validation
//
// NOTE: The HTTP-level rate limit middleware is bypassed in dev mode
// (isDev check at apps/api/src/rate-limit/middleware.ts:6,16) which is
// always true in the test environment. This tests the store logic directly,
// which is the same code path production uses once the middleware calls it.
// ---------------------------------------------------------------------------
describe("rate limiting — store layer", () => {
  test("rejects requests after threshold exceeded", async () => {
    setEnabled(true);
    try {
      const key = `test-rl-${testId()}`;
      // Send exactly max requests — all should be allowed
      for (let i = 0; i < 3; i++) {
        const result = await checkRateLimit(key, 3, 60);
        expect(result.allowed).toBe(true);
      }
      // One more — should be rejected
      const result = await checkRateLimit(key, 3, 60);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    } finally {
      await resetStore();
      setEnabled(false);
    }
  });

  test("allows requests again after window reset", async () => {
    setEnabled(true);
    try {
      const key = `test-rl-reset-${testId()}`;
      // Exhaust the limit with a 1-second window
      for (let i = 0; i < 3; i++) {
        await checkRateLimit(key, 3, 1);
      }
      const blocked = await checkRateLimit(key, 3, 1);
      expect(blocked.allowed).toBe(false);

      // Wait for the 1-second window to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const result = await checkRateLimit(key, 3, 1);
      expect(result.allowed).toBe(true);
    } finally {
      await resetStore();
      setEnabled(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 6. Demo auth rejection
//
// The demo-sign-in endpoint requires DEMO_EMAIL, DEMO_OTP_CODE, and
// STACK_SECRET_SERVER_KEY to be configured. When not configured, the
// endpoint returns 404 (disabled). When configured, wrong credentials
// must return 401 before reaching Stack Auth.
// ---------------------------------------------------------------------------
describe("demo auth rejection", () => {
  let demoConfigured: boolean;

  beforeAll(async () => {
    // Probe whether demo auth is enabled in this environment
    const res = await fetch(`${getBaseUrl()}/api/auth/demo-sign-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "probe@example.com", code: "000000" }),
    });
    // 404 = demo mode not configured; 401 = configured and rejecting
    demoConfigured = res.status !== 404;
  });

  test("wrong email → 401 (or 404 if demo disabled)", async () => {
    const res = await fetch(`${getBaseUrl()}/api/auth/demo-sign-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "wrong@example.com", code: "999999" }),
    });
    if (demoConfigured) {
      expect(res.status).toBe(401);
    } else {
      expect(res.status).toBe(404);
    }
  });

  test("correct email, wrong code → 401 (or 404 if demo disabled)", async () => {
    const res = await fetch(`${getBaseUrl()}/api/auth/demo-sign-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "demo-test@openslaq.dev",
        code: "000000",
      }),
    });
    if (demoConfigured) {
      expect(res.status).toBe(401);
    } else {
      expect(res.status).toBe(404);
    }
  });
});
