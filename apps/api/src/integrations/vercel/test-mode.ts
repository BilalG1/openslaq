/**
 * Simulated Vercel webhook payloads for testing without a real Vercel webhook.
 */

export function getTestPayload(eventName: string): {
  type: string;
  payload: Record<string, unknown>;
  projectId: string;
} | null {
  const payloads: Record<string, { type: string; payload: Record<string, unknown>; projectId: string }> = {
    deployment_created: {
      type: "deployment.created",
      projectId: "test-project-id",
      payload: {
        type: "deployment.created",
        payload: {
          name: "my-app",
          deployment: {
            url: "my-app-abc123.vercel.app",
            inspectorUrl: "https://vercel.com/acme/my-app/deployments/dpl_abc123",
            creator: { username: "alice", email: "alice@acme.dev" },
            meta: { target: "production" },
          },
          target: "production",
        },
      },
    },
    deployment_ready: {
      type: "deployment.ready",
      projectId: "test-project-id",
      payload: {
        type: "deployment.ready",
        payload: {
          name: "my-app",
          deployment: {
            url: "my-app-abc123.vercel.app",
            inspectorUrl: "https://vercel.com/acme/my-app/deployments/dpl_abc123",
            creator: { username: "alice" },
            meta: { target: "production" },
          },
        },
      },
    },
    deployment_succeeded: {
      type: "deployment.succeeded",
      projectId: "test-project-id",
      payload: {
        type: "deployment.succeeded",
        payload: {
          name: "my-app",
          deployment: {
            url: "my-app-abc123.vercel.app",
            inspectorUrl: "https://vercel.com/acme/my-app/deployments/dpl_abc123",
            creator: { username: "alice" },
            meta: { target: "production" },
          },
        },
      },
    },
    deployment_error: {
      type: "deployment.error",
      projectId: "test-project-id",
      payload: {
        type: "deployment.error",
        payload: {
          name: "my-app",
          deployment: {
            url: "my-app-abc123.vercel.app",
            inspectorUrl: "https://vercel.com/acme/my-app/deployments/dpl_abc123",
            creator: { username: "alice" },
            meta: { target: "production" },
          },
        },
      },
    },
    deployment_canceled: {
      type: "deployment.canceled",
      projectId: "test-project-id",
      payload: {
        type: "deployment.canceled",
        payload: {
          name: "my-app",
          deployment: {
            url: "my-app-abc123.vercel.app",
            inspectorUrl: "https://vercel.com/acme/my-app/deployments/dpl_abc123",
            creator: { username: "alice" },
            meta: { target: "production" },
          },
        },
      },
    },
    deployment_promoted: {
      type: "deployment.promoted",
      projectId: "test-project-id",
      payload: {
        type: "deployment.promoted",
        payload: {
          name: "my-app",
          deployment: {
            url: "my-app-abc123.vercel.app",
            inspectorUrl: "https://vercel.com/acme/my-app/deployments/dpl_abc123",
            creator: { username: "alice" },
            meta: { target: "production" },
          },
          target: "production",
        },
      },
    },
    deployment_rollback: {
      type: "deployment.rollback",
      projectId: "test-project-id",
      payload: {
        type: "deployment.rollback",
        payload: {
          name: "my-app",
          deployment: {
            url: "my-app-abc123.vercel.app",
            inspectorUrl: "https://vercel.com/acme/my-app/deployments/dpl_abc123",
            creator: { username: "alice" },
            meta: { target: "production" },
          },
        },
      },
    },
    project_created: {
      type: "project.created",
      projectId: "test-project-id",
      payload: {
        type: "project.created",
        payload: {
          name: "new-project",
          team: { slug: "acme" },
        },
      },
    },
    project_removed: {
      type: "project.removed",
      projectId: "test-project-id",
      payload: {
        type: "project.removed",
        payload: {
          name: "old-project",
          team: { slug: "acme" },
        },
      },
    },
    domain_created: {
      type: "domain.created",
      projectId: "test-project-id",
      payload: {
        type: "domain.created",
        payload: {
          name: "example.com",
          projectName: "my-app",
          team: { slug: "acme" },
        },
      },
    },
    alert_triggered: {
      type: "alerts.triggered",
      projectId: "test-project-id",
      payload: {
        type: "alerts.triggered",
        payload: {
          project: { name: "my-app" },
          alert: {
            name: "High Error Rate",
            url: "https://vercel.com/acme/my-app/monitoring",
          },
        },
      },
    },
  };

  return payloads[eventName] ?? null;
}

export const TEST_EVENT_NAMES = [
  "deployment_created",
  "deployment_ready",
  "deployment_succeeded",
  "deployment_error",
  "deployment_canceled",
  "deployment_promoted",
  "deployment_rollback",
  "project_created",
  "project_removed",
  "domain_created",
  "alert_triggered",
];
