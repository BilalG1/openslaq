import type { StackAuthConfig } from "../auth-strategies";

function loadStackAuthModule() {
  jest.resetModules();
  return require("../stack-auth") as typeof import("../stack-auth");
}

/** Build a fake unsigned JWT with the given payload claims. */
function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.`;
}

const testConfig: StackAuthConfig = {
  projectId: "proj_test",
  publishableKey: "pck_test",
};

describe("stack-auth oauth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  it("builds authorize URL with required Stack Auth query params", () => {
    const { getOAuthAuthorizeUrl } = loadStackAuthModule();
    const url = getOAuthAuthorizeUrl(
      testConfig,
      "Google",
      "openslaq://redirect",
      "challenge-123",
      "state-123",
    );
    const parsed = new URL(url);

    expect(parsed.pathname).toBe("/api/v1/auth/oauth/authorize/google");
    expect(parsed.searchParams.get("client_id")).toBe("proj_test");
    expect(parsed.searchParams.get("client_secret")).toBe("pck_test");
    expect(parsed.searchParams.get("redirect_uri")).toBe("openslaq://redirect");
    expect(parsed.searchParams.get("scope")).toBe("legacy");
    expect(parsed.searchParams.get("state")).toBe("state-123");
    expect(parsed.searchParams.get("grant_type")).toBe("authorization_code");
    expect(parsed.searchParams.get("code_challenge")).toBe("challenge-123");
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("type")).toBe("authenticate");
  });

  it("uses public-client sentinel when publishable key is missing", () => {
    const configNoKey: StackAuthConfig = { projectId: "proj_test", publishableKey: "" };
    const { getOAuthAuthorizeUrl } = loadStackAuthModule();
    const url = getOAuthAuthorizeUrl(
      configNoKey,
      "github",
      "openslaq://redirect",
      "challenge-123",
      "state-123",
    );
    const parsed = new URL(url);

    expect(parsed.searchParams.get("client_secret")).toBe(
      "__stack_public_client__",
    );
  });

  it("exchanges oauth code with form-encoded body including client credentials", async () => {
    const fetchMock = global.fetch as unknown as jest.Mock;
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: "access",
          refresh_token: "refresh",
          user_id: "user",
        }),
    });

    const { exchangeOAuthCode } = loadStackAuthModule();
    await exchangeOAuthCode(testConfig, "code-123", "openslaq://redirect", "verifier-123");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [
      string,
      { body: string; headers: Record<string, string>; method: string },
    ];
    expect(url).toBe("https://api.stack-auth.com/api/v1/auth/oauth/token");
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe(
      "application/x-www-form-urlencoded",
    );

    const body = new URLSearchParams(options.body);
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("code-123");
    expect(body.get("redirect_uri")).toBe("openslaq://redirect");
    expect(body.get("code_verifier")).toBe("verifier-123");
    expect(body.get("client_id")).toBe("proj_test");
    expect(body.get("client_secret")).toBe("pck_test");
  });

  it("exchangeOAuthCode extracts user_id from JWT sub when response omits user_id", async () => {
    const jwt = fakeJwt({ sub: "jwt-user-123" });
    const fetchMock = global.fetch as unknown as jest.Mock;
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: jwt,
          refresh_token: "refresh",
        }),
    });

    const { exchangeOAuthCode } = loadStackAuthModule();
    const result = await exchangeOAuthCode(testConfig, "code", "openslaq://redirect", "verifier");

    expect(result).toEqual({
      access_token: jwt,
      refresh_token: "refresh",
      user_id: "jwt-user-123",
    });
  });

  it("exchangeOAuthCode prefers explicit user_id over JWT sub", async () => {
    const jwt = fakeJwt({ sub: "jwt-user" });
    const fetchMock = global.fetch as unknown as jest.Mock;
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: jwt,
          refresh_token: "refresh",
          user_id: "explicit-user",
        }),
    });

    const { exchangeOAuthCode } = loadStackAuthModule();
    const result = await exchangeOAuthCode(testConfig, "code", "openslaq://redirect", "verifier");

    expect(result.user_id).toBe("explicit-user");
  });

  it("refreshAccessToken extracts user_id from JWT sub when response omits user_id", async () => {
    const jwt = fakeJwt({ sub: "jwt-user-456" });
    const fetchMock = global.fetch as unknown as jest.Mock;
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: jwt,
          refresh_token: "new-refresh",
        }),
    });

    const { refreshAccessToken } = loadStackAuthModule();
    const result = await refreshAccessToken(testConfig, "old-refresh");

    expect(result).toEqual({
      access_token: jwt,
      refresh_token: "new-refresh",
      user_id: "jwt-user-456",
    });
  });
});

describe("stack-auth OTP", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  it("sendOtpCode posts email and callback_url, returns nonce", async () => {
    const fetchMock = global.fetch as unknown as jest.Mock;
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ nonce: "nonce-abc" }),
    });

    const { sendOtpCode } = loadStackAuthModule();
    const result = await sendOtpCode(testConfig, "test@test.com", "openslaq://auth/otp");

    expect(result).toEqual({ nonce: "nonce-abc" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [
      string,
      { body: string; headers: Record<string, string>; method: string },
    ];
    expect(url).toBe(
      "https://api.stack-auth.com/api/v1/auth/otp/send-sign-in-code",
    );
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body);
    expect(body.email).toBe("test@test.com");
    expect(body.callback_url).toBe("openslaq://auth/otp");
    expect(options.headers["X-Stack-Project-Id"]).toBe("proj_test");
  });

  it("verifyOtpCode concatenates code + nonce and returns tokens", async () => {
    const fetchMock = global.fetch as unknown as jest.Mock;
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: "at",
          refresh_token: "rt",
          user_id: "uid",
        }),
    });

    const { verifyOtpCode } = loadStackAuthModule();
    const result = await verifyOtpCode(testConfig, "123456", "nonce-xyz");

    expect(result).toEqual({
      access_token: "at",
      refresh_token: "rt",
      user_id: "uid",
    });
    const [, options] = fetchMock.mock.calls[0] as [
      string,
      { body: string },
    ];
    const body = JSON.parse(options.body);
    expect(body.code).toBe("123456nonce-xyz");
  });

  it("sendOtpCode throws on error response", async () => {
    const fetchMock = global.fetch as unknown as jest.Mock;
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: "Invalid email" }),
    });

    const { sendOtpCode } = loadStackAuthModule();
    await expect(
      sendOtpCode(testConfig, "bad", "openslaq://auth/otp"),
    ).rejects.toThrow("Invalid email");
  });
});

describe("stack-auth Apple native", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  it("posts id_token and returns auth tokens", async () => {
    const fetchMock = global.fetch as unknown as jest.Mock;
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: "apple-at",
          refresh_token: "apple-rt",
          user_id: "apple-uid",
        }),
    });

    const { signInWithAppleNative } = loadStackAuthModule();
    const result = await signInWithAppleNative(testConfig, "apple-id-token");

    expect(result).toEqual({
      access_token: "apple-at",
      refresh_token: "apple-rt",
      user_id: "apple-uid",
    });
    const [url, options] = fetchMock.mock.calls[0] as [
      string,
      { body: string; headers: Record<string, string>; method: string },
    ];
    expect(url).toBe(
      "https://api.stack-auth.com/api/v1/auth/oauth/callback/apple/native",
    );
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body);
    expect(body.id_token).toBe("apple-id-token");
  });

  it("throws on error response", async () => {
    const fetchMock = global.fetch as unknown as jest.Mock;
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ message: "Invalid token" }),
    });

    const { signInWithAppleNative } = loadStackAuthModule();
    await expect(signInWithAppleNative(testConfig, "bad")).rejects.toThrow("Invalid token");
  });
});
