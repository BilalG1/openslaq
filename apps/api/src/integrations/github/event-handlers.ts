import {
  formatPrOpened,
  formatPrClosed,
  formatPrReopened,
  formatReview,
  formatReviewRequested,
  formatCheckSuite,
  type FormattedGithubMessage,
} from "./message-formatter";

/**
 * Map a GitHub webhook event + payload to a formatted message.
 * Returns null if the event/action is not handled or not subscribed.
 */
export function handleGithubEvent(
  eventType: string,
  payload: Record<string, unknown>,
  enabledEvents: string[],
): FormattedGithubMessage | null {
  const repo = (payload.repository as { full_name?: string })?.full_name ?? "unknown/repo";

  if (eventType === "pull_request") {
    const action = payload.action as string;
    const pr = payload.pull_request as Record<string, unknown>;
    if (!pr) return null;

    const prData = {
      number: pr.number as number,
      title: pr.title as string,
      url: pr.html_url as string,
      user: (pr.user as { login: string }).login,
      body: (pr.body as string) || undefined,
      base: ((pr.base as { ref: string })?.ref) || "main",
      merged: pr.merged as boolean,
      additions: pr.additions as number,
      deletions: pr.deletions as number,
    };

    if (action === "review_requested" && enabledEvents.includes("review_requests")) {
      const reviewer = payload.requested_reviewer as { login: string } | undefined;
      if (!reviewer) return null;
      return formatReviewRequested({
        repo,
        pr: prData,
        requestedReviewer: reviewer.login,
      });
    }

    if (!enabledEvents.includes("pulls")) return null;

    if (action === "opened") return formatPrOpened({ repo, pr: prData });
    if (action === "closed") return formatPrClosed({ repo, pr: prData });
    if (action === "reopened") return formatPrReopened({ repo, pr: prData });

    return null;
  }

  if (eventType === "pull_request_review") {
    if (!enabledEvents.includes("reviews")) return null;

    const action = payload.action as string;
    if (action !== "submitted") return null;

    const pr = payload.pull_request as Record<string, unknown>;
    const review = payload.review as Record<string, unknown>;
    if (!pr || !review) return null;

    return formatReview({
      repo,
      pr: {
        number: pr.number as number,
        title: pr.title as string,
        url: pr.html_url as string,
      },
      review: {
        user: (review.user as { login: string }).login,
        state: review.state as string,
        body: (review.body as string) || undefined,
      },
    });
  }

  if (eventType === "check_suite") {
    if (!enabledEvents.includes("checks")) return null;

    const action = payload.action as string;
    if (action !== "completed") return null;

    const cs = payload.check_suite as Record<string, unknown>;
    if (!cs) return null;

    return formatCheckSuite({
      repo,
      checkSuite: {
        conclusion: cs.conclusion as string,
        branch: (cs.head_branch as string) || "unknown",
        headSha: (cs.head_sha as string) || "",
        url: cs.url as string | undefined,
      },
    });
  }

  return null;
}
