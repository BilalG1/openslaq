export interface FormattedLinearMessage {
  content: string;
  actions: Array<{ label: string; url: string; style?: "primary" | "default" }>;
}

export function formatIssueCreated(payload: IssuePayload): FormattedLinearMessage {
  const { teamKey, issue } = payload;
  let content = `**[${teamKey}]** Issue created by **${issue.creator}**\n`;
  content += `[${issue.identifier} ${issue.title}](${issue.url})`;
  if (issue.description) {
    const summary = issue.description.length > 200 ? issue.description.slice(0, 200) + "\u2026" : issue.description;
    content += `\n> ${summary}`;
  }
  if (issue.priority) {
    content += `\n Priority: ${issue.priority}`;
  }

  return {
    content,
    actions: [{ label: "View in Linear", url: issue.url, style: "primary" }],
  };
}

export function formatIssueStatusChanged(payload: IssuePayload): FormattedLinearMessage {
  const { teamKey, issue } = payload;
  const content = `**[${teamKey}]** ${issue.identifier} status changed to **${issue.status}**\n[${issue.title}](${issue.url})`;

  return {
    content,
    actions: [{ label: "View in Linear", url: issue.url }],
  };
}

export function formatIssueAssigned(payload: IssueAssignedPayload): FormattedLinearMessage {
  const { teamKey, issue, assignee } = payload;
  const content = `**[${teamKey}]** ${issue.identifier} assigned to **${assignee}**\n[${issue.title}](${issue.url})`;

  return {
    content,
    actions: [{ label: "View in Linear", url: issue.url }],
  };
}

export function formatIssueLabelChanged(payload: IssuePayload & { labels: string[] }): FormattedLinearMessage {
  const { teamKey, issue, labels } = payload;
  const content = `**[${teamKey}]** ${issue.identifier} labels updated: ${labels.join(", ")}\n[${issue.title}](${issue.url})`;

  return {
    content,
    actions: [{ label: "View in Linear", url: issue.url }],
  };
}

export function formatCommentCreated(payload: CommentPayload): FormattedLinearMessage {
  const { teamKey, issue, comment } = payload;
  let content = `**[${teamKey}]** **${comment.user}** commented on [${issue.identifier} ${issue.title}](${issue.url})`;
  if (comment.body) {
    const summary = comment.body.length > 200 ? comment.body.slice(0, 200) + "\u2026" : comment.body;
    content += `\n> ${summary}`;
  }

  return {
    content,
    actions: [{ label: "View in Linear", url: issue.url, style: "primary" }],
  };
}

export function formatProjectUpdate(payload: ProjectPayload): FormattedLinearMessage {
  const { project, action } = payload;
  const verb = action === "create" ? "created" : "updated";
  let content = `**Project ${verb}:** [${project.name}](${project.url})`;
  if (project.status) {
    content += ` — ${project.status}`;
  }

  return {
    content,
    actions: project.url ? [{ label: "View in Linear", url: project.url }] : [],
  };
}

export function formatCycleStarted(payload: CyclePayload): FormattedLinearMessage {
  const { teamKey, cycle } = payload;
  const content = `\u{1F504} **[${teamKey}]** Cycle **${cycle.name || cycle.number}** started`;

  return {
    content,
    actions: cycle.url ? [{ label: "View in Linear", url: cycle.url }] : [],
  };
}

export function formatCycleCompleted(payload: CyclePayload): FormattedLinearMessage {
  const { teamKey, cycle } = payload;
  let content = `\u2705 **[${teamKey}]** Cycle **${cycle.name || cycle.number}** completed`;
  if (cycle.completedIssueCount !== undefined && cycle.issueCount !== undefined) {
    content += ` (${cycle.completedIssueCount}/${cycle.issueCount} issues)`;
  }

  return {
    content,
    actions: cycle.url ? [{ label: "View in Linear", url: cycle.url }] : [],
  };
}

// --- Payload types ---

export interface IssuePayload {
  teamKey: string;
  issue: {
    identifier: string;
    title: string;
    url: string;
    creator: string;
    description?: string;
    priority?: string;
    status?: string;
  };
}

export interface IssueAssignedPayload {
  teamKey: string;
  issue: {
    identifier: string;
    title: string;
    url: string;
  };
  assignee: string;
}

export interface CommentPayload {
  teamKey: string;
  issue: {
    identifier: string;
    title: string;
    url: string;
  };
  comment: {
    user: string;
    body?: string;
  };
}

export interface ProjectPayload {
  action: string;
  project: {
    name: string;
    url: string;
    status?: string;
  };
}

export interface CyclePayload {
  teamKey: string;
  cycle: {
    name?: string;
    number: number;
    url?: string;
    issueCount?: number;
    completedIssueCount?: number;
  };
}
