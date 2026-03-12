import { isValidSlug, isValidId } from "../deep-link-validation";

describe("isValidSlug", () => {
  it.each(["default", "my-workspace", "ws_123", "A"])("allows %s", (slug) => {
    expect(isValidSlug(slug)).toBe(true);
  });

  it.each([
    "",
    "-starts-with-dash",
    "_starts-with-underscore",
    "../traversal",
    "has spaces",
    "a".repeat(64),
  ])("rejects %s", (slug) => {
    expect(isValidSlug(slug)).toBe(false);
  });
});

describe("isValidId", () => {
  it("allows valid UUID v4", () => {
    expect(isValidId("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it.each([
    "",
    "not-a-uuid",
    "../../../etc/passwd",
    "550e8400-e29b-31d4-a716-446655440000", // v3 not v4
  ])("rejects %s", (id) => {
    expect(isValidId(id)).toBe(false);
  });
});
