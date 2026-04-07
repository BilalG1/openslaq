import { describe, test, expect } from "bun:test";
import { getBaseUrl } from "./helpers/api-client";

const DEMO_EMAIL = process.env.DEMO_EMAIL ?? "demo-test@openslaq.dev";
const DEMO_OTP_CODE = process.env.DEMO_OTP_CODE ?? "999999";

describe("demo-sign-in", () => {
  function demoSignIn(body: { email: string; code: string }) {
    return fetch(`${getBaseUrl()}/api/auth/demo-sign-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  test("wrong email → 401", async () => {
    const res = await demoSignIn({ email: "wrong@example.com", code: DEMO_OTP_CODE });
    expect(res.status as number).toBe(401);
  });

  test("wrong code → 401", async () => {
    const res = await demoSignIn({ email: DEMO_EMAIL, code: "000000" });
    expect(res.status as number).toBe(401);
  });

  test("invalid email format → 400", async () => {
    const res = await demoSignIn({ email: "not-an-email", code: DEMO_OTP_CODE });
    expect(res.status as number).toBe(400);
  });

  // The happy path requires a real Stack Auth project (not the test project ID).
  // Run manually with: DEMO_HAPPY_PATH=1 bun run test:api -- --filter demo
  const runHappyPath = !!process.env.DEMO_HAPPY_PATH;
  (runHappyPath ? test : test.skip)("correct email + code → 200 with tokens", async () => {
    const res = await demoSignIn({ email: DEMO_EMAIL, code: DEMO_OTP_CODE });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { userId: string; accessToken: string; refreshToken: string };
    expect(json.userId).toBeString();
    expect(json.accessToken).toBeString();
    expect(json.refreshToken).toBeString();

    // Verify the returned token works for an authenticated request
    const meRes = await fetch(`${getBaseUrl()}/api/users/me`, {
      headers: { Authorization: `Bearer ${json.accessToken}` },
    });
    expect(meRes.status).toBe(200);
  });
});
