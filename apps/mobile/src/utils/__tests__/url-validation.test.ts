import { Linking } from "react-native";
import { isSafeUrl, openSafeUrl } from "../url-validation";

jest.mock("react-native", () => ({
  Linking: { openURL: jest.fn(() => Promise.resolve()) },
}));

describe("isSafeUrl", () => {
  it.each([
    "https://example.com",
    "http://localhost:3000",
    "mailto:user@example.com",
  ])("allows %s", (url) => {
    expect(isSafeUrl(url)).toBe(true);
  });

  it.each([
    "javascript:alert(1)",
    "tel:+1234567890",
    "file:///etc/passwd",
    "data:text/html,<script>alert(1)</script>",
    "not-a-url",
    "",
  ])("rejects %s", (url) => {
    expect(isSafeUrl(url)).toBe(false);
  });
});

describe("openSafeUrl", () => {
  beforeEach(() => jest.clearAllMocks());

  it("opens safe URLs via Linking", () => {
    expect(openSafeUrl("https://example.com")).toBe(true);
    expect(Linking.openURL).toHaveBeenCalledWith("https://example.com");
  });

  it("blocks unsafe URLs", () => {
    expect(openSafeUrl("javascript:alert(1)")).toBe(false);
    expect(Linking.openURL).not.toHaveBeenCalled();
  });
});
