import {
  formatDeploymentCreated,
  formatDeploymentReady,
  formatDeploymentSucceeded,
  formatDeploymentError,
  formatDeploymentCanceled,
  formatDeploymentPromoted,
  formatDeploymentRollback,
  formatProjectCreated,
  formatProjectRemoved,
  formatDomainCreated,
  formatAlertTriggered,
  type FormattedVercelMessage,
} from "./message-formatter";

/**
 * Map a Vercel webhook event to a formatted message.
 * Returns null if the event type is not handled or not subscribed.
 */
export function handleVercelEvent(
  type: string,
  payload: Record<string, unknown>,
  enabledEvents: string[],
): FormattedVercelMessage | null {
  const category = eventCategory(type);
  if (!category) return null;
  if (!enabledEvents.includes(category)) return null;

  return routeEvent(type, payload);
}

function eventCategory(type: string): string | null {
  if (type.startsWith("deployment.")) return "deployments";
  if (type.startsWith("project.")) return "projects";
  if (type.startsWith("domain.")) return "domains";
  if (type.startsWith("alerts.")) return "alerts";
  return null;
}

function routeEvent(
  type: string,
  payload: Record<string, unknown>,
): FormattedVercelMessage | null {
  const p = payload.payload as Record<string, unknown> | undefined;
  if (!p) return null;

  switch (type) {
    case "deployment.created":
      return handleDeploymentEvent(p, formatDeploymentCreated);
    case "deployment.ready":
      return handleDeploymentEvent(p, formatDeploymentReady);
    case "deployment.succeeded":
      return handleDeploymentEvent(p, formatDeploymentSucceeded);
    case "deployment.error":
      return handleDeploymentEvent(p, formatDeploymentError);
    case "deployment.canceled":
      return handleDeploymentEvent(p, formatDeploymentCanceled);
    case "deployment.promoted":
      return handleDeploymentEvent(p, formatDeploymentPromoted);
    case "deployment.rollback":
      return handleDeploymentEvent(p, formatDeploymentRollback);
    case "project.created":
      return handleProjectEvent(p, "created");
    case "project.removed":
      return handleProjectEvent(p, "removed");
    case "domain.created":
      return handleDomainEvent(p);
    case "alerts.triggered":
      return handleAlertEvent(p);
    default:
      return null;
  }
}

function handleDeploymentEvent(
  p: Record<string, unknown>,
  formatter: typeof formatDeploymentCreated,
): FormattedVercelMessage {
  const deployment = p.deployment as Record<string, unknown> | undefined;
  const project = (p.name as string) ?? (deployment?.name as string) ?? "unknown";
  // Creator can be on deployment.creator, or top-level user
  const user = p.user as Record<string, unknown> | undefined;
  const deploymentCreator = deployment?.creator as Record<string, unknown> | undefined;
  const creator = deploymentCreator?.username as string
    ?? deploymentCreator?.email as string
    ?? user?.username as string
    ?? user?.email as string
    ?? "someone";
  const target = (deployment?.meta as Record<string, unknown>)?.target as string
    ?? (p.target as string)
    ?? "production";
  const url = deployment?.url as string | undefined;
  const inspectorUrl = deployment?.inspectorUrl as string | undefined;

  return formatter({
    project,
    deployment: { url, inspectorUrl, creator, target },
  });
}

function handleProjectEvent(
  p: Record<string, unknown>,
  action: string,
): FormattedVercelMessage | null {
  const name = (p.name as string) ?? "unknown";
  const team = p.team as Record<string, unknown> | undefined;
  const teamSlug = team?.slug as string | undefined;

  if (action === "created") {
    return formatProjectCreated({ project: { name }, teamSlug });
  }
  if (action === "removed") {
    return formatProjectRemoved({ project: { name }, teamSlug });
  }
  return null;
}

function handleDomainEvent(p: Record<string, unknown>): FormattedVercelMessage | null {
  const domain = (p.name as string) ?? (p.domain as string) ?? "unknown";
  const project = (p.projectName as string) ?? "unknown";
  const team = p.team as Record<string, unknown> | undefined;
  const teamSlug = team?.slug as string | undefined;

  return formatDomainCreated({ domain, project, teamSlug });
}

function handleAlertEvent(p: Record<string, unknown>): FormattedVercelMessage | null {
  const project = (p.project as Record<string, unknown>)?.name as string ?? "unknown";
  const alertName = (p.alert as Record<string, unknown>)?.name as string
    ?? (p.name as string)
    ?? "Unknown alert";
  const alertUrl = (p.alert as Record<string, unknown>)?.url as string | undefined;

  return formatAlertTriggered({ project, alert: { name: alertName, url: alertUrl } });
}
