import { describe, test, expect } from "bun:test";
import {
  formatPrOpened,
  formatPrClosed,
  formatPrReopened,
  formatReview,
  formatReviewRequested,
  formatCheckSuite,
} from "../../api/src/integrations/github/message-formatter";

describe("formatPrOpened", () => {
  test("includes repo, user, PR number, title, and URL", () => {
    const msg = formatPrOpened({
      repo: "acme/widget",
      pr: { number: 42, title: "Add feature", url: "https://github.com/acme/widget/pull/42", user: "alice", base: "main" },
    });
    expect(msg.content).toContain("acme/widget");
    expect(msg.content).toContain("@alice");
    expect(msg.content).toContain("#42");
    expect(msg.content).toContain("Add feature");
    expect(msg.content).toContain("https://github.com/acme/widget/pull/42");
  });

  test("truncates body over 200 chars", () => {
    const longBody = "x".repeat(250);
    const msg = formatPrOpened({
      repo: "acme/widget",
      pr: { number: 1, title: "T", url: "https://example.com", user: "u", base: "main", body: longBody },
    });
    expect(msg.content).toContain("x".repeat(200) + "…");
    expect(msg.content).not.toContain("x".repeat(201));
  });

  test("omits body when null/undefined", () => {
    const msg = formatPrOpened({
      repo: "acme/widget",
      pr: { number: 1, title: "T", url: "https://example.com", user: "u", base: "main" },
    });
    expect(msg.content).not.toContain(">");
  });

  test("includes additions and deletions", () => {
    const msg = formatPrOpened({
      repo: "r",
      pr: { number: 1, title: "T", url: "https://example.com", user: "u", base: "main", additions: 10, deletions: 5 },
    });
    expect(msg.content).toContain("+10 -5");
  });

  test("defaults additions/deletions to 0", () => {
    const msg = formatPrOpened({
      repo: "r",
      pr: { number: 1, title: "T", url: "https://example.com", user: "u", base: "main" },
    });
    expect(msg.content).toContain("+0 -0");
  });

  test("returns View PR and Review actions", () => {
    const msg = formatPrOpened({
      repo: "r",
      pr: { number: 1, title: "T", url: "https://example.com/pull/1", user: "u", base: "main" },
    });
    expect(msg.actions).toHaveLength(2);
    expect(msg.actions[0]).toMatchObject({ label: "View PR", url: "https://example.com/pull/1", style: "primary" });
    expect(msg.actions[1]).toMatchObject({ label: "Review", url: "https://example.com/pull/1/files", style: "default" });
  });
});

describe("formatPrClosed", () => {
  test("says 'merged' when merged is true", () => {
    const msg = formatPrClosed({
      repo: "r",
      pr: { number: 1, title: "T", url: "https://example.com", user: "u", base: "main", merged: true },
    });
    expect(msg.content).toContain("merged");
    expect(msg.content).not.toContain("closed");
  });

  test("says 'closed' when merged is false", () => {
    const msg = formatPrClosed({
      repo: "r",
      pr: { number: 1, title: "T", url: "https://example.com", user: "u", base: "main", merged: false },
    });
    expect(msg.content).toContain("closed");
  });

  test("returns View PR action", () => {
    const msg = formatPrClosed({
      repo: "r",
      pr: { number: 1, title: "T", url: "https://example.com", user: "u", base: "main" },
    });
    expect(msg.actions).toHaveLength(1);
    expect(msg.actions[0]!.label).toBe("View PR");
  });
});

describe("formatPrReopened", () => {
  test("says 'reopened'", () => {
    const msg = formatPrReopened({
      repo: "r",
      pr: { number: 1, title: "T", url: "https://example.com", user: "u", base: "main" },
    });
    expect(msg.content).toContain("reopened");
  });

  test("returns View PR action", () => {
    const msg = formatPrReopened({
      repo: "r",
      pr: { number: 1, title: "T", url: "https://example.com", user: "u", base: "main" },
    });
    expect(msg.actions).toHaveLength(1);
    expect(msg.actions[0]!.label).toBe("View PR");
  });
});

describe("formatReview", () => {
  test("maps approved state to verb", () => {
    const msg = formatReview({
      repo: "r",
      pr: { number: 1, title: "T", url: "https://example.com" },
      review: { user: "bob", state: "approved" },
    });
    expect(msg.content).toContain("approved");
  });

  test("maps changes_requested state to verb", () => {
    const msg = formatReview({
      repo: "r",
      pr: { number: 1, title: "T", url: "https://example.com" },
      review: { user: "bob", state: "changes_requested" },
    });
    expect(msg.content).toContain("requested changes on");
  });

  test("maps commented state to verb", () => {
    const msg = formatReview({
      repo: "r",
      pr: { number: 1, title: "T", url: "https://example.com" },
      review: { user: "bob", state: "commented" },
    });
    expect(msg.content).toContain("commented on");
  });

  test("truncates review body over 200 chars", () => {
    const longBody = "y".repeat(250);
    const msg = formatReview({
      repo: "r",
      pr: { number: 1, title: "T", url: "https://example.com" },
      review: { user: "bob", state: "approved", body: longBody },
    });
    expect(msg.content).toContain("y".repeat(200) + "…");
  });

  test("omits body when null/undefined", () => {
    const msg = formatReview({
      repo: "r",
      pr: { number: 1, title: "T", url: "https://example.com" },
      review: { user: "bob", state: "approved" },
    });
    expect(msg.content).not.toContain(">");
  });
});

describe("formatReviewRequested", () => {
  test("includes requested reviewer name", () => {
    const msg = formatReviewRequested({
      repo: "r",
      pr: { number: 1, title: "T", url: "https://example.com", user: "alice" },
      requestedReviewer: "charlie",
    });
    expect(msg.content).toContain("@charlie");
    expect(msg.content).toContain("@alice");
  });
});

describe("formatCheckSuite", () => {
  test("uses ✅ for success", () => {
    const msg = formatCheckSuite({
      repo: "r",
      checkSuite: { conclusion: "success", branch: "main", headSha: "abc1234567890" },
    });
    expect(msg.content).toContain("✅");
    expect(msg.content).toContain("passed");
  });

  test("uses ❌ for failure", () => {
    const msg = formatCheckSuite({
      repo: "r",
      checkSuite: { conclusion: "failure", branch: "main", headSha: "abc1234567890" },
    });
    expect(msg.content).toContain("❌");
    expect(msg.content).toContain("failed");
  });

  test("includes branch and 7-char SHA", () => {
    const msg = formatCheckSuite({
      repo: "r",
      checkSuite: { conclusion: "success", branch: "feat-x", headSha: "abc1234567890" },
    });
    expect(msg.content).toContain("feat-x");
    expect(msg.content).toContain("abc1234");
    expect(msg.content).not.toContain("abc12345");
  });

  test("returns empty actions when no URL", () => {
    const msg = formatCheckSuite({
      repo: "r",
      checkSuite: { conclusion: "success", branch: "main", headSha: "abc1234567890" },
    });
    expect(msg.actions).toHaveLength(0);
  });

  test("returns View Checks action when URL provided", () => {
    const msg = formatCheckSuite({
      repo: "r",
      checkSuite: { conclusion: "success", branch: "main", headSha: "abc1234567890", url: "https://example.com/checks" },
    });
    expect(msg.actions).toHaveLength(1);
    expect(msg.actions[0]!.label).toBe("View Checks");
  });
});
