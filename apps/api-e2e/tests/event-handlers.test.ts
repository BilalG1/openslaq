import { describe, test, expect } from "bun:test";
import { handleGithubEvent } from "../../api/src/integrations/github/event-handlers";

const basePrPayload = {
  repository: { full_name: "acme/widget" },
  pull_request: {
    number: 42,
    title: "Add feature",
    html_url: "https://github.com/acme/widget/pull/42",
    user: { login: "alice" },
    body: "Some description",
    base: { ref: "main" },
    merged: false,
    additions: 10,
    deletions: 3,
  },
};

describe("pull_request events", () => {
  test("opened with pulls enabled returns message", () => {
    const result = handleGithubEvent("pull_request", { ...basePrPayload, action: "opened" }, ["pulls"]);
    expect(result).not.toBeNull();
    expect(result!.content).toContain("opened");
    expect(result!.content).toContain("acme/widget");
  });

  test("closed with pulls enabled returns message", () => {
    const result = handleGithubEvent("pull_request", { ...basePrPayload, action: "closed" }, ["pulls"]);
    expect(result).not.toBeNull();
    expect(result!.content).toContain("closed");
  });

  test("reopened with pulls enabled returns message", () => {
    const result = handleGithubEvent("pull_request", { ...basePrPayload, action: "reopened" }, ["pulls"]);
    expect(result).not.toBeNull();
    expect(result!.content).toContain("reopened");
  });

  test("pulls disabled returns null", () => {
    const result = handleGithubEvent("pull_request", { ...basePrPayload, action: "opened" }, ["reviews"]);
    expect(result).toBeNull();
  });

  test("review_requested with review_requests enabled returns message", () => {
    const payload = {
      ...basePrPayload,
      action: "review_requested",
      requested_reviewer: { login: "bob" },
    };
    const result = handleGithubEvent("pull_request", payload, ["review_requests"]);
    expect(result).not.toBeNull();
    expect(result!.content).toContain("@bob");
  });

  test("review_requested without review_requests enabled returns null", () => {
    const payload = {
      ...basePrPayload,
      action: "review_requested",
      requested_reviewer: { login: "bob" },
    };
    const result = handleGithubEvent("pull_request", payload, ["pulls"]);
    expect(result).toBeNull();
  });

  test("unsupported action returns null", () => {
    const result = handleGithubEvent("pull_request", { ...basePrPayload, action: "labeled" }, ["pulls"]);
    expect(result).toBeNull();
  });

  test("missing pull_request payload returns null", () => {
    const result = handleGithubEvent("pull_request", { action: "opened", repository: { full_name: "r" } }, ["pulls"]);
    expect(result).toBeNull();
  });
});

describe("pull_request_review events", () => {
  const reviewPayload = {
    repository: { full_name: "acme/widget" },
    action: "submitted",
    pull_request: {
      number: 42,
      title: "Add feature",
      html_url: "https://github.com/acme/widget/pull/42",
    },
    review: {
      user: { login: "bob" },
      state: "approved",
      body: "LGTM",
    },
  };

  test("submitted with reviews enabled returns message", () => {
    const result = handleGithubEvent("pull_request_review", reviewPayload, ["reviews"]);
    expect(result).not.toBeNull();
    expect(result!.content).toContain("approved");
  });

  test("reviews disabled returns null", () => {
    const result = handleGithubEvent("pull_request_review", reviewPayload, ["pulls"]);
    expect(result).toBeNull();
  });

  test("non-submitted action returns null", () => {
    const result = handleGithubEvent("pull_request_review", { ...reviewPayload, action: "dismissed" }, ["reviews"]);
    expect(result).toBeNull();
  });
});

describe("check_suite events", () => {
  const checkPayload = {
    repository: { full_name: "acme/widget" },
    action: "completed",
    check_suite: {
      conclusion: "success",
      head_branch: "main",
      head_sha: "abc1234567890",
      url: "https://github.com/acme/widget/runs/1",
    },
  };

  test("completed with checks enabled returns message", () => {
    const result = handleGithubEvent("check_suite", checkPayload, ["checks"]);
    expect(result).not.toBeNull();
    expect(result!.content).toContain("✅");
  });

  test("checks disabled returns null", () => {
    const result = handleGithubEvent("check_suite", checkPayload, ["pulls"]);
    expect(result).toBeNull();
  });

  test("non-completed action returns null", () => {
    const result = handleGithubEvent("check_suite", { ...checkPayload, action: "requested" }, ["checks"]);
    expect(result).toBeNull();
  });
});

describe("unknown events", () => {
  test("returns null for unknown event type", () => {
    const result = handleGithubEvent("issues", { repository: { full_name: "r" }, action: "opened" }, ["pulls"]);
    expect(result).toBeNull();
  });

  test("uses 'unknown/repo' when repository is missing", () => {
    // For pull_request with no repository, repo defaults to unknown/repo
    const result = handleGithubEvent("pull_request", {
      action: "opened",
      pull_request: {
        number: 1,
        title: "T",
        html_url: "https://example.com",
        user: { login: "u" },
        base: { ref: "main" },
      },
    }, ["pulls"]);
    expect(result).not.toBeNull();
    expect(result!.content).toContain("unknown/repo");
  });
});
