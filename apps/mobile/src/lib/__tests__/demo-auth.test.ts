import { performDemoSignIn } from "../dev-auth";

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe("performDemoSignIn", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sends correct request and returns tokens", async () => {
    const mockResponse = {
      userId: "demo-user-123",
      accessToken: "access-token",
      refreshToken: "refresh-token",
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await performDemoSignIn(
      "https://api.example.com",
      "demo@example.com",
      "123456",
    );

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/api/auth/demo-sign-in",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "demo@example.com", code: "123456" }),
      },
    );
    expect(result).toEqual(mockResponse);
  });

  it("throws on non-200 response with error message", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: "Invalid email or code" }),
    });

    await expect(
      performDemoSignIn("https://api.example.com", "demo@example.com", "wrong"),
    ).rejects.toThrow("Invalid email or code");
  });

  it("throws generic message when response has no error field", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("not json")),
    });

    await expect(
      performDemoSignIn("https://api.example.com", "demo@example.com", "123456"),
    ).rejects.toThrow("Demo sign-in failed (500)");
  });
});
