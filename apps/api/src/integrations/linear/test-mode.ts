/**
 * Simulated Linear webhook payloads for testing without a real Linear webhook.
 */

export function getTestPayload(eventName: string): {
  payload: Record<string, unknown>;
} | null {
  const payloads: Record<string, { payload: Record<string, unknown> }> = {
    issue_created: {
      payload: {
        type: "Issue",
        action: "create",
        actor: { name: "Alice" },
        data: {
          identifier: "BAC-42",
          title: "Fix authentication timeout",
          url: "https://linear.app/acme/issue/BAC-42",
          description: "Users are getting logged out after 5 minutes of inactivity",
          priority: 2,
          team: { key: "BAC" },
          state: { name: "Todo" },
        },
      },
    },
    issue_closed: {
      payload: {
        type: "Issue",
        action: "update",
        updatedFrom: { stateId: "previous-state-id" },
        data: {
          identifier: "BAC-42",
          title: "Fix authentication timeout",
          url: "https://linear.app/acme/issue/BAC-42",
          team: { key: "BAC" },
          state: { name: "Done" },
        },
      },
    },
    issue_assigned: {
      payload: {
        type: "Issue",
        action: "update",
        updatedFrom: { assigneeId: null },
        data: {
          identifier: "BAC-42",
          title: "Fix authentication timeout",
          url: "https://linear.app/acme/issue/BAC-42",
          team: { key: "BAC" },
          assignee: { name: "Bob" },
        },
      },
    },
    comment_created: {
      payload: {
        type: "Comment",
        action: "create",
        data: {
          body: "I think we should use a refresh token approach instead.",
          user: { name: "Charlie" },
          issue: {
            identifier: "BAC-42",
            title: "Fix authentication timeout",
            url: "https://linear.app/acme/issue/BAC-42",
            team: { key: "BAC" },
          },
        },
      },
    },
    project_updated: {
      payload: {
        type: "Project",
        action: "update",
        data: {
          name: "Q1 Launch",
          url: "https://linear.app/acme/project/q1-launch",
          state: "started",
        },
      },
    },
    cycle_started: {
      payload: {
        type: "Cycle",
        action: "create",
        data: {
          name: "Sprint 12",
          number: 12,
          url: "https://linear.app/acme/cycle/12",
          startsAt: new Date().toISOString(),
          team: { key: "BAC" },
        },
      },
    },
    cycle_completed: {
      payload: {
        type: "Cycle",
        action: "update",
        updatedFrom: { completedAt: null },
        data: {
          name: "Sprint 11",
          number: 11,
          url: "https://linear.app/acme/cycle/11",
          completedAt: new Date().toISOString(),
          team: { key: "BAC" },
          issueCountHistory: 15,
          completedIssueCountHistory: 13,
        },
      },
    },
  };

  return payloads[eventName] ?? null;
}

export const TEST_EVENT_NAMES = [
  "issue_created",
  "issue_closed",
  "issue_assigned",
  "comment_created",
  "project_updated",
  "cycle_started",
  "cycle_completed",
];
