import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { WorkspaceMemberEnv } from "../../workspaces/role-middleware";
import { requireRole } from "../../workspaces/role-middleware";
import { ROLES } from "@openslaq/shared";
import { rlMemberManage } from "../../rate-limit";
import { okSchema, errorSchema } from "../../openapi/schemas";
import { env } from "../../env";
import { createConnection, getConnectionForWorkspace } from "./service";
import { getOrganization } from "./linear-api";

const oauthUrlRoute = createRoute({
  method: "get",
  path: "/oauth-url",
  tags: ["Linear"],
  summary: "Get Linear OAuth authorization URL",
  description: "Returns the URL to start the Linear OAuth flow.",
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
      description: "Linear integration not configured",
    },
  },
});

const connectRoute = createRoute({
  method: "post",
  path: "/connect",
  tags: ["Linear"],
  summary: "Exchange OAuth code for Linear access token",
  description: "Exchanges an OAuth authorization code for an access token and stores the connection.",
  security: [{ Bearer: [] }],
  middleware: [rlMemberManage, requireRole(ROLES.ADMIN)] as const,
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            code: z.string().describe("OAuth authorization code"),
            redirectUri: z.string().describe("Redirect URI used in the OAuth flow"),
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
      description: "Linear integration not configured",
    },
  },
});

const getConnectionRoute = createRoute({
  method: "get",
  path: "/connection",
  tags: ["Linear"],
  summary: "Get Linear connection info",
  description: "Returns the Linear organization connected to this workspace.",
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
                linearOrganizationId: z.string(),
                linearOrganizationName: z.string(),
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
    if (!env.LINEAR_CLIENT_ID) {
      return c.json({ error: "Linear integration is not configured" }, 503);
    }

    const redirectUri = `${c.req.url.split("/api/")[0]}/api/integrations/linear-bot/oauth/callback`;
    const params = new URLSearchParams({
      client_id: env.LINEAR_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "read,write",
      prompt: "consent",
    });

    return c.json({ url: `https://linear.app/oauth/authorize?${params.toString()}` }, 200);
  })
  .openapi(connectRoute, async (c) => {
    if (!env.LINEAR_CLIENT_ID || !env.LINEAR_CLIENT_SECRET) {
      return c.json({ error: "Linear integration is not configured" }, 503);
    }

    const workspace = c.get("workspace");
    const user = c.get("user");
    const { code, redirectUri } = c.req.valid("json");

    // Check if already connected
    const existing = await getConnectionForWorkspace(workspace.id);
    if (existing) {
      return c.json({ error: "A Linear organization is already connected to this workspace" }, 409);
    }

    // Exchange code for access token
    const tokenRes = await fetch("https://api.linear.app/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: env.LINEAR_CLIENT_ID,
        client_secret: env.LINEAR_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      return c.json({ error: "Failed to exchange authorization code" }, 400);
    }

    const tokenData = (await tokenRes.json()) as { access_token: string };
    const accessToken = tokenData.access_token;

    // Fetch org info
    const org = await getOrganization(accessToken);

    await createConnection(
      workspace.id,
      org.id,
      org.name,
      accessToken,
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
            linearOrganizationId: connection.linearOrganizationId,
            linearOrganizationName: connection.linearOrganizationName,
          }
        : null,
    }, 200);
  });

export default app;
