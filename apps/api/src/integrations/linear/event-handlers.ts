import {
  formatIssueCreated,
  formatIssueStatusChanged,
  formatIssueAssigned,
  formatIssueLabelChanged,
  formatCommentCreated,
  formatProjectUpdate,
  formatCycleStarted,
  formatCycleCompleted,
  type FormattedLinearMessage,
} from "./message-formatter";

/**
 * Map a Linear webhook event to a formatted message.
 * Returns null if the event/action is not handled or not subscribed.
 */
export function handleLinearEvent(
  payload: Record<string, unknown>,
  enabledEvents: string[],
): FormattedLinearMessage | null {
  const type = payload.type as string | undefined;
  const action = payload.action as string | undefined;

  if (!type || !action) return null;

  if (type === "Issue") {
    if (!enabledEvents.includes("issues")) return null;
    return handleIssueEvent(action, payload);
  }

  if (type === "Comment") {
    if (!enabledEvents.includes("comments")) return null;
    return handleCommentEvent(action, payload);
  }

  if (type === "Project" || type === "ProjectUpdate") {
    if (!enabledEvents.includes("projects")) return null;
    return handleProjectEvent(action, payload);
  }

  if (type === "Cycle") {
    if (!enabledEvents.includes("cycles")) return null;
    return handleCycleEvent(action, payload);
  }

  return null;
}

function handleIssueEvent(
  action: string,
  payload: Record<string, unknown>,
): FormattedLinearMessage | null {
  const data = payload.data as Record<string, unknown> | undefined;
  if (!data) return null;

  const team = data.team as { key?: string } | undefined;
  const teamKey = team?.key ?? "???";

  const issue = {
    identifier: (data.identifier as string) ?? "",
    title: (data.title as string) ?? "Untitled",
    url: (data.url as string) ?? "",
    creator: (payload.actor as { name?: string })?.name ?? (data.creator as { name?: string })?.name ?? "Someone",
    description: data.description as string | undefined,
    priority: (data.priorityLabel as string | undefined) ?? priorityLabel(data.priority as number | undefined),
    status: (data.state as { name?: string })?.name,
  };

  if (action === "create") {
    return formatIssueCreated({ teamKey, issue });
  }

  if (action === "update") {
    const updatedFrom = payload.updatedFrom as Record<string, unknown> | undefined;
    if (!updatedFrom) return null;

    // Status change
    if (updatedFrom.stateId !== undefined && issue.status) {
      return formatIssueStatusChanged({ teamKey, issue });
    }

    // Assignment change
    if (updatedFrom.assigneeId !== undefined) {
      const assignee = (data.assignee as { name?: string })?.name ?? "Unassigned";
      return formatIssueAssigned({ teamKey, issue, assignee });
    }

    // Label change
    if (updatedFrom.labelIds !== undefined) {
      const labels = (data.labels as { nodes?: Array<{ name: string }> })?.nodes?.map((l) => l.name) ?? [];
      if (labels.length > 0) {
        return formatIssueLabelChanged({ teamKey, issue, labels });
      }
    }
  }

  return null;
}

function handleCommentEvent(
  action: string,
  payload: Record<string, unknown>,
): FormattedLinearMessage | null {
  if (action !== "create") return null;

  const data = payload.data as Record<string, unknown> | undefined;
  if (!data) return null;

  const issue = data.issue as Record<string, unknown> | undefined;
  if (!issue) return null;

  const team = (issue.team as { key?: string }) ?? {};
  const teamKey = team.key ?? "???";
  const user = (data.user as { name?: string }) ?? {};

  return formatCommentCreated({
    teamKey,
    issue: {
      identifier: (issue.identifier as string) ?? "",
      title: (issue.title as string) ?? "Untitled",
      url: (issue.url as string) ?? "",
    },
    comment: {
      user: user.name ?? "Someone",
      body: data.body as string | undefined,
    },
  });
}

function handleProjectEvent(
  action: string,
  payload: Record<string, unknown>,
): FormattedLinearMessage | null {
  if (action !== "create" && action !== "update") return null;

  const data = payload.data as Record<string, unknown> | undefined;
  if (!data) return null;

  return formatProjectUpdate({
    action,
    project: {
      name: (data.name as string) ?? "Untitled Project",
      url: (data.url as string) ?? "",
      status: (data.state as string) ?? undefined,
    },
  });
}

function handleCycleEvent(
  action: string,
  payload: Record<string, unknown>,
): FormattedLinearMessage | null {
  const data = payload.data as Record<string, unknown> | undefined;
  if (!data) return null;

  const team = data.team as { key?: string } | undefined;
  const teamKey = team?.key ?? "???";

  const cycle = {
    name: data.name as string | undefined,
    number: (data.number as number) ?? 0,
    url: data.url as string | undefined,
    issueCount: data.issueCountHistory as number | undefined,
    completedIssueCount: data.completedIssueCountHistory as number | undefined,
  };

  if (action === "create" || action === "update") {
    // Check if cycle is starting (startsAt is now/past)
    const startsAt = data.startsAt as string | undefined;
    const completedAt = data.completedAt as string | undefined;

    if (completedAt) {
      return formatCycleCompleted({ teamKey, cycle });
    }

    if (startsAt && action === "create") {
      return formatCycleStarted({ teamKey, cycle });
    }

    // Generic cycle update — check updatedFrom for state changes
    const updatedFrom = payload.updatedFrom as Record<string, unknown> | undefined;
    if (updatedFrom?.completedAt === null && completedAt) {
      return formatCycleCompleted({ teamKey, cycle });
    }
  }

  return null;
}

function priorityLabel(priority: number | undefined): string | undefined {
  if (priority === undefined || priority === null) return undefined;
  const labels: Record<number, string> = {
    0: "No priority",
    1: "Urgent",
    2: "High",
    3: "Medium",
    4: "Low",
  };
  return labels[priority];
}
