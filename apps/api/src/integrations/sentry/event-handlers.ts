import {
  formatIssueCreated,
  formatIssueResolved,
  formatIssueRegression,
  formatIssueEscalating,
  formatMetricAlert,
  formatDeploy,
  type FormattedSentryMessage,
} from "./message-formatter";

/**
 * Map a Sentry webhook event to a formatted message.
 * Returns null if the event/action is not handled or not subscribed.
 */
export function handleSentryEvent(
  payload: Record<string, unknown>,
  enabledEvents: string[],
): FormattedSentryMessage | null {
  const resource = payload.resource as string | undefined;
  const action = payload.action as string | undefined;

  if (!resource || !action) return null;

  if (resource === "issue") {
    if (!enabledEvents.includes("issues")) return null;
    return handleIssueEvent(action, payload);
  }

  if (resource === "event_alert") {
    if (!enabledEvents.includes("issues")) return null;
    return handleEventAlert(payload);
  }

  if (resource === "metric_alert") {
    if (!enabledEvents.includes("metrics")) return null;
    return handleMetricAlertEvent(payload);
  }

  // Deploy events come via the installation resource
  if (resource === "installation" && action === "deploy") {
    if (!enabledEvents.includes("deploys")) return null;
    return handleDeployEvent(payload);
  }

  return null;
}

function handleIssueEvent(
  action: string,
  payload: Record<string, unknown>,
): FormattedSentryMessage | null {
  const data = payload.data as Record<string, unknown> | undefined;
  if (!data) return null;

  const issue = data.issue as Record<string, unknown> | undefined;
  if (!issue) return null;

  const project = (issue.project as { slug?: string; name?: string })?.name
    ?? (issue.project as { slug?: string })?.slug
    ?? "unknown";
  const title = (issue.title as string) ?? "Untitled";
  const url = (issue.web_url as string) ?? (issue.url as string) ?? "";
  const culprit = issue.culprit as string | undefined;

  const issuePayload = { project, issue: { title, url, culprit } };

  switch (action) {
    case "created":
      return formatIssueCreated(issuePayload);
    case "resolved":
      return formatIssueResolved(issuePayload);
    case "regression":
      return formatIssueRegression(issuePayload);
    case "escalating":
      return formatIssueEscalating(issuePayload);
    default:
      return null;
  }
}

function handleEventAlert(
  payload: Record<string, unknown>,
): FormattedSentryMessage | null {
  const data = payload.data as Record<string, unknown> | undefined;
  if (!data) return null;

  const event = data.event as Record<string, unknown> | undefined;
  if (!event) return null;

  const project = (event.project as string) ?? "unknown";
  const title = (event.title as string) ?? "Untitled";
  const url = (event.web_url as string) ?? (event.url as string) ?? "";
  const culprit = event.culprit as string | undefined;

  return formatIssueCreated({ project, issue: { title, url, culprit } });
}

function handleMetricAlertEvent(
  payload: Record<string, unknown>,
): FormattedSentryMessage | null {
  const data = payload.data as Record<string, unknown> | undefined;
  if (!data) return null;

  const metricAlert = data.metric_alert as Record<string, unknown> | undefined;
  if (!metricAlert) return null;

  const projects = metricAlert.projects as string[] | undefined;
  const project = projects?.[0] ?? "unknown";
  const name = (metricAlert.title as string) ?? (metricAlert.alert_rule as string) ?? "Untitled";
  const url = (metricAlert.web_url as string) ?? "";

  return formatMetricAlert({ project, alert: { name, url } });
}

function handleDeployEvent(
  payload: Record<string, unknown>,
): FormattedSentryMessage | null {
  const data = payload.data as Record<string, unknown> | undefined;
  if (!data) return null;

  const deploy = data.deploy as Record<string, unknown> | undefined;
  if (!deploy) return null;

  const project = (deploy.project as string) ?? "unknown";
  const version = (deploy.version as string) ?? "unknown";
  const environment = (deploy.environment as string) ?? "unknown";
  const url = deploy.url as string | undefined;

  return formatDeploy({ project, deploy: { version, environment, url } });
}
