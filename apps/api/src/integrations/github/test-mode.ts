/**
 * Simulated GitHub webhook payloads for testing without a real GitHub App.
 */

export function getTestPayload(eventName: string): {
  eventType: string;
  payload: Record<string, unknown>;
} | null {
  const payloads: Record<string, { eventType: string; payload: Record<string, unknown> }> = {
    pr_opened: {
      eventType: "pull_request",
      payload: {
        action: "opened",
        repository: { full_name: "acme/widget" },
        pull_request: {
          number: 123,
          title: "Fix the login bug",
          html_url: "https://github.com/acme/widget/pull/123",
          user: { login: "octocat" },
          body: "Fix the login flow when the user has 2FA enabled",
          base: { ref: "main" },
          merged: false,
          additions: 42,
          deletions: 7,
        },
      },
    },
    pr_merged: {
      eventType: "pull_request",
      payload: {
        action: "closed",
        repository: { full_name: "acme/widget" },
        pull_request: {
          number: 123,
          title: "Fix the login bug",
          html_url: "https://github.com/acme/widget/pull/123",
          user: { login: "octocat" },
          base: { ref: "main" },
          merged: true,
        },
      },
    },
    pr_closed: {
      eventType: "pull_request",
      payload: {
        action: "closed",
        repository: { full_name: "acme/widget" },
        pull_request: {
          number: 123,
          title: "Fix the login bug",
          html_url: "https://github.com/acme/widget/pull/123",
          user: { login: "octocat" },
          base: { ref: "main" },
          merged: false,
        },
      },
    },
    review_approved: {
      eventType: "pull_request_review",
      payload: {
        action: "submitted",
        repository: { full_name: "acme/widget" },
        pull_request: {
          number: 123,
          title: "Fix the login bug",
          html_url: "https://github.com/acme/widget/pull/123",
        },
        review: {
          user: { login: "reviewer" },
          state: "approved",
          body: "LGTM!",
        },
      },
    },
    review_changes: {
      eventType: "pull_request_review",
      payload: {
        action: "submitted",
        repository: { full_name: "acme/widget" },
        pull_request: {
          number: 123,
          title: "Fix the login bug",
          html_url: "https://github.com/acme/widget/pull/123",
        },
        review: {
          user: { login: "reviewer" },
          state: "changes_requested",
          body: "Please add tests",
        },
      },
    },
    review_requested: {
      eventType: "pull_request",
      payload: {
        action: "review_requested",
        repository: { full_name: "acme/widget" },
        pull_request: {
          number: 123,
          title: "Fix the login bug",
          html_url: "https://github.com/acme/widget/pull/123",
          user: { login: "octocat" },
          base: { ref: "main" },
        },
        requested_reviewer: { login: "reviewer" },
      },
    },
    checks_success: {
      eventType: "check_suite",
      payload: {
        action: "completed",
        repository: { full_name: "acme/widget" },
        check_suite: {
          conclusion: "success",
          head_branch: "fix-login",
          head_sha: "abc1234567890",
          url: "https://github.com/acme/widget/actions/runs/123",
        },
      },
    },
    checks_failure: {
      eventType: "check_suite",
      payload: {
        action: "completed",
        repository: { full_name: "acme/widget" },
        check_suite: {
          conclusion: "failure",
          head_branch: "fix-login",
          head_sha: "abc1234567890",
          url: "https://github.com/acme/widget/actions/runs/123",
        },
      },
    },
  };

  return payloads[eventName] ?? null;
}

export const TEST_EVENT_NAMES = [
  "pr_opened",
  "pr_merged",
  "pr_closed",
  "review_approved",
  "review_changes",
  "review_requested",
  "checks_success",
  "checks_failure",
];
