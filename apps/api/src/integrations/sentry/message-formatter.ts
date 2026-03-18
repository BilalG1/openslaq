export interface FormattedSentryMessage {
  content: string;
  actions: Array<{ label: string; url: string; style?: "primary" | "default" }>;
}

export function formatIssueCreated(payload: IssuePayload): FormattedSentryMessage {
  const { project, issue } = payload;
  let content = `**[${project}]** New issue: **${issue.title}**`;
  if (issue.culprit) {
    content += `\n> ${issue.culprit}`;
  }

  return {
    content,
    actions: [{ label: "View in Sentry", url: issue.url, style: "primary" }],
  };
}

export function formatIssueResolved(payload: IssuePayload): FormattedSentryMessage {
  const { project, issue } = payload;
  const content = `**[${project}]** Issue resolved: **${issue.title}**`;

  return {
    content,
    actions: [{ label: "View in Sentry", url: issue.url, style: "primary" }],
  };
}

export function formatIssueRegression(payload: IssuePayload): FormattedSentryMessage {
  const { project, issue } = payload;
  const content = `**[${project}]** Issue regression: **${issue.title}**`;

  return {
    content,
    actions: [{ label: "View in Sentry", url: issue.url, style: "primary" }],
  };
}

export function formatIssueEscalating(payload: IssuePayload): FormattedSentryMessage {
  const { project, issue } = payload;
  const content = `**[${project}]** Issue escalating: **${issue.title}**`;

  return {
    content,
    actions: [{ label: "View in Sentry", url: issue.url, style: "primary" }],
  };
}

export function formatMetricAlert(payload: MetricAlertPayload): FormattedSentryMessage {
  const { project, alert } = payload;
  const content = `**[${project}]** Metric alert: **${alert.name}** threshold crossed`;

  return {
    content,
    actions: [{ label: "View in Sentry", url: alert.url, style: "primary" }],
  };
}

export function formatDeploy(payload: DeployPayload): FormattedSentryMessage {
  const { project, deploy } = payload;
  const content = `**[${project}]** Deployed **${deploy.version}** to **${deploy.environment}**`;

  return {
    content,
    actions: deploy.url ? [{ label: "View in Sentry", url: deploy.url, style: "primary" }] : [],
  };
}

// --- Payload types ---

export interface IssuePayload {
  project: string;
  issue: {
    title: string;
    url: string;
    culprit?: string;
  };
}

export interface MetricAlertPayload {
  project: string;
  alert: {
    name: string;
    url: string;
  };
}

export interface DeployPayload {
  project: string;
  deploy: {
    version: string;
    environment: string;
    url?: string;
  };
}
