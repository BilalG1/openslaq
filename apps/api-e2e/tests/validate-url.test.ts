import { describe, test, expect } from "bun:test";
import { isBlockedIPv4, validateWebhookUrl } from "../../api/src/bots/validate-url";

describe("isBlockedIPv4", () => {
  test("10.x.x.x → blocked (private class A)", () => {
    expect(isBlockedIPv4("10.0.0.1")).toBe(true);
    expect(isBlockedIPv4("10.255.255.255")).toBe(true);
  });

  test("172.16-31.x.x → blocked (private class B)", () => {
    expect(isBlockedIPv4("172.16.0.1")).toBe(true);
    expect(isBlockedIPv4("172.31.255.255")).toBe(true);
  });

  test("172.15.x.x → not blocked", () => {
    expect(isBlockedIPv4("172.15.0.1")).toBe(false);
  });

  test("172.32.x.x → not blocked", () => {
    expect(isBlockedIPv4("172.32.0.1")).toBe(false);
  });

  test("192.168.x.x → blocked (private class C)", () => {
    expect(isBlockedIPv4("192.168.0.1")).toBe(true);
    expect(isBlockedIPv4("192.168.255.255")).toBe(true);
  });

  test("127.x.x.x → blocked (loopback)", () => {
    expect(isBlockedIPv4("127.0.0.1")).toBe(true);
    expect(isBlockedIPv4("127.255.255.255")).toBe(true);
  });

  test("169.254.x.x → blocked (link-local)", () => {
    expect(isBlockedIPv4("169.254.0.1")).toBe(true);
    expect(isBlockedIPv4("169.254.169.254")).toBe(true);
  });

  test("0.x.x.x → blocked", () => {
    expect(isBlockedIPv4("0.0.0.0")).toBe(true);
    expect(isBlockedIPv4("0.1.2.3")).toBe(true);
  });

  test("public IPs → not blocked", () => {
    expect(isBlockedIPv4("8.8.8.8")).toBe(false);
    expect(isBlockedIPv4("1.1.1.1")).toBe(false);
    expect(isBlockedIPv4("93.184.216.34")).toBe(false);
  });

  test("malformed inputs → false", () => {
    expect(isBlockedIPv4("not.an.ip")).toBe(false);
    expect(isBlockedIPv4("1.2.3")).toBe(false);
    expect(isBlockedIPv4("")).toBe(false);
    expect(isBlockedIPv4("abc")).toBe(false);
  });
});

describe("validateWebhookUrl", () => {
  test("empty string → invalid URL", () => {
    const result = validateWebhookUrl("");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("Invalid URL");
  });

  test("not-a-url → invalid URL", () => {
    const result = validateWebhookUrl("not-a-url");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("Invalid URL");
  });

  test("ftp:// → only http/https allowed", () => {
    const result = validateWebhookUrl("ftp://example.com");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("Only http and https");
  });

  test("valid https URL → ok (test mode bypass)", () => {
    const result = validateWebhookUrl("https://example.com/webhook");
    expect(result).toEqual({ ok: true });
  });

  test("valid http URL → ok (test mode bypass)", () => {
    const result = validateWebhookUrl("http://example.com/webhook");
    expect(result).toEqual({ ok: true });
  });
});
