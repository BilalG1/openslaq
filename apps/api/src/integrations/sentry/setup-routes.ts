import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { WorkspaceMemberEnv } from "../../workspaces/role-middleware";
import { requireRole } from "../../workspaces/role-middleware";
import { ROLES } from "@openslaq/shared";
import { rlMemberManage } from "../../rate-limit";
import { okSchema, errorSchema } from "../../openapi/schemas";
import { env } from "../../env";
import { createConnection, getConnectionForWorkspace } from "./service";

const oauthUrlRoute = createRoute({
  method: "get",
  path: "/oauth-url",
  tags: ["Sentry"],
  summary: "Get Sentry OAuth installation URL",
  description: "Returns the URL to start the Sentry app installation flow.",
  security: [{ Bearer: [] }],
  middleware: [rlMemberManage, requireRole(ROLES.ADMIN)] as const,
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ url: z.string() }),
        },
      },
      description: "OAuth URL",
    },
    503: {
      content: { "application/json": { schema: errorSchema } },
      description: "Sentry integration not configured",
    },
  },
});

const connectRoute = createRoute({
  method: "post",
  path: "/connect",
  tags: ["Sentry"],
  summary: "Exchange Sentry installation code for access token",
  description: "Exchanges a Sentry app installation code for an access token and stores the connection.",
  security: [{ Bearer: [] }],
  middleware: [rlMemberManage, requireRole(ROLES.ADMIN)] as const,
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            code: z.string().describe("Authorization code from Sentry"),
            installationId: z.string().describe("Sentry app installation ID"),
            orgSlug: z.string().describe("Sentry organization slug"),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: okSchema } },
      description: "Connection established",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad request",
    },
    409: {
      content: { "application/json": { schema: errorSchema } },
      description: "Already connected",
    },
    503: {
      content: { "application/json": { schema: errorSchema } },
      description: "Sentry integration not configured",
    },
  },
});

const getConnectionRoute = createRoute({
  method: "get",
  path: "/connection",
  tags: ["Sentry"],
  summary: "Get Sentry connection info",
  description: "Returns the Sentry organization connected to this workspace.",
  security: [{ Bearer: [] }],
  middleware: [rlMemberManage] as const,
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            connection: z
              .object({
                id: z.string(),
                sentryOrganizationSlug: z.string(),
              })
              .nullable(),
          }),
        },
      },
      description: "Connection info",
    },
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(oauthUrlRoute, async (c) => {
    if (!env.SENTRY_CLIENT_ID || !env.SENTRY_APP_SLUG) {
      return c.json({ error: "Sentry integration is not configured" }, 503);
    }

    const url = `https://sentry.io/sentry-apps/${env.SENTRY_APP_SLUG}/external-install/`;

    return c.json({ url }, 200);
  })
  .openapi(connectRoute, async (c) => {
    if (!env.SENTRY_CLIENT_ID || !env.SENTRY_CLIENT_SECRET) {
      return c.json({ error: "Sentry integration is not configured" }, 503);
    }

    const workspace = c.get("workspace");
    const user = c.get("user");
    const { code, installationId, orgSlug } = c.req.valid("json");

    // Check if already connected
    const existing = await getConnectionForWorkspace(workspace.id);
    if (existing) {
      return c.json({ error: "A Sentry organization is already connected to this workspace" }, 409);
    }

    // Exchange code for access token
    const tokenRes = await fetch(
      `https://sentry.io/api/0/sentry-app-installations/${installationId}/authorizations/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          client_id: env.SENTRY_CLIENT_ID,
          client_secret: env.SENTRY_CLIENT_SECRET,
        }),
      },
    );

    if (!tokenRes.ok) {
      return c.json({ error: "Failed to exchange authorization code" }, 400);
    }

    const tokenData = (await tokenRes.json()) as {
      token: string;
      refreshToken: string;
      expiresAt: string;
    };

    await createConnection(
      workspace.id,
      orgSlug,
      installationId,
      tokenData.token,
      tokenData.refreshToken,
      new Date(tokenData.expiresAt),
      user.id,
    );

    return c.json({ ok: true as const }, 200);
  })
  .openapi(getConnectionRoute, async (c) => {
    const workspace = c.get("workspace");
    const connection = await getConnectionForWorkspace(workspace.id);

    return c.json({
      connection: connection
        ? {
            id: connection.id,
            sentryOrganizationSlug: connection.sentryOrganizationSlug,
          }
        : null,
    }, 200);
  });

export default app;
