export interface FormattedGithubMessage {
  content: string;
  actions: Array<{ label: string; url: string; style?: "primary" | "default" }>;
}

export function formatPrOpened(payload: PullRequestPayload): FormattedGithubMessage {
  const { repo, pr } = payload;
  const additions = pr.additions ?? 0;
  const deletions = pr.deletions ?? 0;

  let content = `**[${repo}]** Pull request opened by **@${pr.user}**\n`;
  content += `[#${pr.number} ${pr.title}](${pr.url})\n`;
  if (pr.body) {
    const summary = pr.body.length > 200 ? pr.body.slice(0, 200) + "\u2026" : pr.body;
    content += `> ${summary}\n`;
  }
  content += `+${additions} -${deletions} | base: ${pr.base}`;

  return {
    content,
    actions: [
      { label: "View PR", url: pr.url, style: "primary" },
      { label: "Review", url: `${pr.url}/files`, style: "default" },
    ],
  };
}

export function formatPrClosed(payload: PullRequestPayload): FormattedGithubMessage {
  const { repo, pr } = payload;
  const verb = pr.merged ? "merged" : "closed";

  return {
    content: `**[${repo}]** Pull request ${verb} by **@${pr.user}**\n[#${pr.number} ${pr.title}](${pr.url})`,
    actions: [{ label: "View PR", url: pr.url }],
  };
}

export function formatPrReopened(payload: PullRequestPayload): FormattedGithubMessage {
  const { repo, pr } = payload;
  return {
    content: `**[${repo}]** Pull request reopened by **@${pr.user}**\n[#${pr.number} ${pr.title}](${pr.url})`,
    actions: [{ label: "View PR", url: pr.url }],
  };
}

export function formatReview(payload: ReviewPayload): FormattedGithubMessage {
  const { repo, pr, review } = payload;

  const stateLabel: Record<string, string> = {
    approved: "approved",
    changes_requested: "requested changes on",
    commented: "commented on",
  };
  const verb = stateLabel[review.state] ?? review.state;

  let content = `**[${repo}]** **@${review.user}** ${verb} PR [#${pr.number} ${pr.title}](${pr.url})`;
  if (review.body) {
    const summary = review.body.length > 200 ? review.body.slice(0, 200) + "\u2026" : review.body;
    content += `\n> ${summary}`;
  }

  return {
    content,
    actions: [
      { label: "View PR", url: pr.url, style: "primary" },
      { label: "Review", url: `${pr.url}/files`, style: "default" },
    ],
  };
}

export function formatReviewRequested(payload: ReviewRequestPayload): FormattedGithubMessage {
  const { repo, pr, requestedReviewer } = payload;

  return {
    content: `**[${repo}]** **@${pr.user}** requested review from **@${requestedReviewer}** on [#${pr.number} ${pr.title}](${pr.url})`,
    actions: [
      { label: "View PR", url: pr.url, style: "primary" },
      { label: "Review", url: `${pr.url}/files`, style: "default" },
    ],
  };
}

export function formatCheckSuite(payload: CheckSuitePayload): FormattedGithubMessage {
  const { repo, checkSuite } = payload;

  const icon = checkSuite.conclusion === "success" ? "\u2705" : "\u274C";
  const status = checkSuite.conclusion === "success" ? "passed" : "failed";

  return {
    content: `${icon} **[${repo}]** Check suite ${status} on \`${checkSuite.branch}\` (${checkSuite.headSha.slice(0, 7)})`,
    actions: checkSuite.url ? [{ label: "View Checks", url: checkSuite.url }] : [],
  };
}

// --- Payload types ---

export interface PullRequestPayload {
  repo: string;
  pr: {
    number: number;
    title: string;
    url: string;
    user: string;
    body?: string;
    base: string;
    merged?: boolean;
    additions?: number;
    deletions?: number;
  };
}

export interface ReviewPayload {
  repo: string;
  pr: {
    number: number;
    title: string;
    url: string;
  };
  review: {
    user: string;
    state: string; // "approved" | "changes_requested" | "commented"
    body?: string;
  };
}

export interface ReviewRequestPayload {
  repo: string;
  pr: {
    number: number;
    title: string;
    url: string;
    user: string;
  };
  requestedReviewer: string;
}

export interface CheckSuitePayload {
  repo: string;
  checkSuite: {
    conclusion: string; // "success" | "failure" | ...
    branch: string;
    headSha: string;
    url?: string;
  };
}
