import { describe, test, expect } from "bun:test";

function getApiUrl() {
  return process.env.API_BASE_URL ?? "http://localhost:3001";
}

describe("mobile OAuth callback", () => {
  test("redirects with code and state", async () => {
    const res = await fetch(
      `${getApiUrl()}/api/auth/mobile-oauth-callback?code=abc&state=xyz`,
      { redirect: "manual" },
    );
    expect(res.status).toBe(302);
    const location = res.headers.get("location");
    expect(location).toBe("openslaq://oauth-callback?code=abc&state=xyz");
  });

  test("redirects with error params", async () => {
    const res = await fetch(
      `${getApiUrl()}/api/auth/mobile-oauth-callback?error=access_denied&error_description=User+cancelled`,
      { redirect: "manual" },
    );
    expect(res.status).toBe(302);
    const location = res.headers.get("location");
    expect(location).toBe(
      "openslaq://oauth-callback?error=access_denied&error_description=User+cancelled",
    );
  });

  test("forwards all params together", async () => {
    const res = await fetch(
      `${getApiUrl()}/api/auth/mobile-oauth-callback?code=abc&state=xyz&error=foo&error_description=bar`,
      { redirect: "manual" },
    );
    expect(res.status).toBe(302);
    const location = res.headers.get("location")!;
    const url = new URL(location);
    expect(url.protocol).toBe("openslaq:");
    expect(url.searchParams.get("code")).toBe("abc");
    expect(url.searchParams.get("state")).toBe("xyz");
    expect(url.searchParams.get("error")).toBe("foo");
    expect(url.searchParams.get("error_description")).toBe("bar");
  });

  test("returns 400 when no code or error", async () => {
    const res = await fetch(
      `${getApiUrl()}/api/auth/mobile-oauth-callback`,
      { redirect: "manual" },
    );
    expect(res.status).toBe(400);
  });

  test("returns 400 when only state is provided", async () => {
    const res = await fetch(
      `${getApiUrl()}/api/auth/mobile-oauth-callback?state=xyz`,
      { redirect: "manual" },
    );
    expect(res.status).toBe(400);
  });

  test("rejects non-openslaq:// scheme in state redirect (open redirect prevention)", async () => {
    const statePayload = JSON.stringify({
      nonce: "abc123",
      redirect: "exp://10.0.0.1:8081/--/",
    });
    const encodedState = btoa(statePayload);
    const res = await fetch(
      `${getApiUrl()}/api/auth/mobile-oauth-callback?code=mycode&state=${encodeURIComponent(encodedState)}`,
      { redirect: "manual" },
    );
    expect(res.status).toBe(302);
    const location = res.headers.get("location")!;
    // Non-openslaq:// schemes fall back to the default redirect
    expect(location).toStartWith("openslaq://oauth-callback?");
    expect(location).toContain("code=mycode");
  });

  test("allows openslaq:// scheme in state redirect", async () => {
    const statePayload = JSON.stringify({
      nonce: "abc123",
      redirect: "openslaq://custom-path",
    });
    const encodedState = btoa(statePayload);
    const res = await fetch(
      `${getApiUrl()}/api/auth/mobile-oauth-callback?code=mycode&state=${encodeURIComponent(encodedState)}`,
      { redirect: "manual" },
    );
    expect(res.status).toBe(302);
    const location = res.headers.get("location")!;
    expect(location).toStartWith("openslaq://custom-path?");
    expect(location).toContain("code=mycode");
  });

  test("falls back to openslaq:// when state is plain string", async () => {
    const res = await fetch(
      `${getApiUrl()}/api/auth/mobile-oauth-callback?code=abc&state=plain-nonce`,
      { redirect: "manual" },
    );
    expect(res.status).toBe(302);
    const location = res.headers.get("location")!;
    expect(location).toStartWith("openslaq://oauth-callback?");
  });
});
