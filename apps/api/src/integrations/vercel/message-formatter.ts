export interface FormattedVercelMessage {
  content: string;
  actions: Array<{ label: string; url: string; style?: "primary" | "default" }>;
}

export function formatDeploymentCreated(payload: DeploymentPayload): FormattedVercelMessage {
  const { project, deployment } = payload;
  let content = `**[${project}]** New deployment by **${deployment.creator}** to \`${deployment.target}\``;
  if (deployment.url) {
    content += `\n> ${deployment.url}`;
  }

  return {
    content,
    actions: deployment.inspectorUrl
      ? [{ label: "View Deployment", url: deployment.inspectorUrl, style: "primary" }]
      : [],
  };
}

export function formatDeploymentReady(payload: DeploymentPayload): FormattedVercelMessage {
  const { project, deployment } = payload;
  const content = `**[${project}]** Deployment live at ${deployment.url ?? "unknown URL"}`;

  return {
    content,
    actions: deployment.url
      ? [{ label: "Open Site", url: `https://${deployment.url}`, style: "primary" }]
      : [],
  };
}

export function formatDeploymentSucceeded(payload: DeploymentPayload): FormattedVercelMessage {
  const { project } = payload;
  const content = `**[${project}]** Deployment succeeded`;

  return {
    content,
    actions: payload.deployment.inspectorUrl
      ? [{ label: "View Deployment", url: payload.deployment.inspectorUrl }]
      : [],
  };
}

export function formatDeploymentError(payload: DeploymentPayload): FormattedVercelMessage {
  const { project } = payload;
  const content = `**[${project}]** Deployment failed`;

  return {
    content,
    actions: payload.deployment.inspectorUrl
      ? [{ label: "View Deployment", url: payload.deployment.inspectorUrl, style: "primary" }]
      : [],
  };
}

export function formatDeploymentCanceled(payload: DeploymentPayload): FormattedVercelMessage {
  const { project } = payload;
  const content = `**[${project}]** Deployment canceled`;

  return {
    content,
    actions: payload.deployment.inspectorUrl
      ? [{ label: "View Deployment", url: payload.deployment.inspectorUrl }]
      : [],
  };
}

export function formatDeploymentPromoted(payload: DeploymentPayload): FormattedVercelMessage {
  const { project, deployment } = payload;
  const content = `**[${project}]** Deployment promoted to \`${deployment.target}\``;

  return {
    content,
    actions: deployment.inspectorUrl
      ? [{ label: "View Deployment", url: deployment.inspectorUrl, style: "primary" }]
      : [],
  };
}

export function formatDeploymentRollback(payload: DeploymentPayload): FormattedVercelMessage {
  const { project } = payload;
  const content = `**[${project}]** Deployment rolled back`;

  return {
    content,
    actions: payload.deployment.inspectorUrl
      ? [{ label: "View Deployment", url: payload.deployment.inspectorUrl }]
      : [],
  };
}

export function formatProjectCreated(payload: ProjectPayload): FormattedVercelMessage {
  const { project, teamSlug } = payload;
  const content = `New project created: **${project.name}**`;
  const url = teamSlug ? `https://vercel.com/${teamSlug}/${project.name}` : "";

  return {
    content,
    actions: url ? [{ label: "View Project", url, style: "primary" }] : [],
  };
}

export function formatProjectRemoved(payload: ProjectPayload): FormattedVercelMessage {
  const { project } = payload;
  const content = `Project removed: **${project.name}**`;

  return {
    content,
    actions: [],
  };
}

export function formatDomainCreated(payload: DomainPayload): FormattedVercelMessage {
  const { domain, project, teamSlug } = payload;
  const content = `**[${project}]** Domain added: **${domain}**`;
  const url = teamSlug ? `https://vercel.com/${teamSlug}/${project}/settings/domains` : "";

  return {
    content,
    actions: url ? [{ label: "View Domains", url }] : [],
  };
}

export function formatAlertTriggered(payload: AlertPayload): FormattedVercelMessage {
  const { project, alert } = payload;
  const content = `**[${project}]** Alert triggered: **${alert.name}**`;

  return {
    content,
    actions: alert.url ? [{ label: "View Alert", url: alert.url, style: "primary" }] : [],
  };
}

// --- Payload types ---

export interface DeploymentPayload {
  project: string;
  deployment: {
    url?: string;
    inspectorUrl?: string;
    creator: string;
    target: string;
  };
}

export interface ProjectPayload {
  project: {
    name: string;
  };
  teamSlug?: string;
}

export interface DomainPayload {
  domain: string;
  project: string;
  teamSlug?: string;
}

export interface AlertPayload {
  project: string;
  alert: {
    name: string;
    url?: string;
  };
}
