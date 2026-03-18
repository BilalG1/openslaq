/**
 * Simulated Sentry webhook payloads for testing without a real Sentry webhook.
 */

export function getTestPayload(eventName: string): {
  payload: Record<string, unknown>;
  projectId: string;
} | null {
  const payloads: Record<string, { payload: Record<string, unknown>; projectId: string }> = {
    issue_created: {
      projectId: "test-project-id",
      payload: {
        resource: "issue",
        action: "created",
        data: {
          issue: {
            title: "TypeError: Cannot read property 'map' of undefined",
            culprit: "app/components/UserList.tsx",
            web_url: "https://sentry.io/organizations/acme/issues/12345/",
            project: { slug: "frontend", name: "frontend" },
            id: "12345",
          },
        },
      },
    },
    issue_resolved: {
      projectId: "test-project-id",
      payload: {
        resource: "issue",
        action: "resolved",
        data: {
          issue: {
            title: "TypeError: Cannot read property 'map' of undefined",
            web_url: "https://sentry.io/organizations/acme/issues/12345/",
            project: { slug: "frontend", name: "frontend" },
            id: "12345",
          },
        },
      },
    },
    issue_regression: {
      projectId: "test-project-id",
      payload: {
        resource: "issue",
        action: "regression",
        data: {
          issue: {
            title: "ConnectionError: Database connection pool exhausted",
            web_url: "https://sentry.io/organizations/acme/issues/67890/",
            project: { slug: "api", name: "api" },
            id: "67890",
          },
        },
      },
    },
    metric_alert: {
      projectId: "test-project-id",
      payload: {
        resource: "metric_alert",
        action: "critical",
        data: {
          metric_alert: {
            title: "P95 Latency > 2s",
            projects: ["api"],
            web_url: "https://sentry.io/organizations/acme/alerts/rules/details/42/",
          },
        },
      },
    },
    deploy: {
      projectId: "test-project-id",
      payload: {
        resource: "installation",
        action: "deploy",
        data: {
          deploy: {
            project: "api",
            version: "v2.4.1",
            environment: "production",
            url: "https://sentry.io/organizations/acme/releases/v2.4.1/",
          },
        },
      },
    },
  };

  return payloads[eventName] ?? null;
}

export const TEST_EVENT_NAMES = [
  "issue_created",
  "issue_resolved",
  "issue_regression",
  "metric_alert",
  "deploy",
];
