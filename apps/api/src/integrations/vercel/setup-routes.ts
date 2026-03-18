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
  tags: ["Vercel"],
  summary: "Get Vercel integration install URL",
  description: "Returns the URL to start the Vercel integration installation flow.",
  security: [{ Bearer: [] }],
  middleware: [rlMemberManage, requireRole(ROLES.ADMIN)] as const,
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ url: z.string() }),
        },
      },
      description: "Integration install URL",
    },
    503: {
      content: { "application/json": { schema: errorSchema } },
      description: "Vercel integration not configured",
    },
  },
});

const connectRoute = createRoute({
  method: "post",
  path: "/connect",
  tags: ["Vercel"],
  summary: "Exchange Vercel OAuth code for access token",
  description: "Exchanges a Vercel integration installation code for an access token and stores the connection.",
  security: [{ Bearer: [] }],
  middleware: [rlMemberManage, requireRole(ROLES.ADMIN)] as const,
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            code: z.string().describe("Authorization code from Vercel"),
            configurationId: z.string().describe("Vercel configuration ID"),
            teamId: z.string().describe("Vercel team ID"),
            teamSlug: z.string().describe("Vercel team slug"),
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
      description: "Vercel integration not configured",
    },
  },
});

const getConnectionRoute = createRoute({
  method: "get",
  path: "/connection",
  tags: ["Vercel"],
  summary: "Get Vercel connection info",
  description: "Returns the Vercel team connected to this workspace.",
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
                vercelTeamId: z.string(),
                vercelTeamSlug: z.string(),
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
    if (!env.VERCEL_CLIENT_ID) {
      return c.json({ error: "Vercel integration is not configured" }, 503);
    }

    const redirectUri = `${c.req.url.split("/api/")[0]}/api/integrations/vercel-bot/oauth/callback`;
    const params = new URLSearchParams({
      client_id: env.VERCEL_CLIENT_ID,
      redirect_uri: redirectUri,
    });

    const integrationSlug = env.NODE_ENV === "production" ? "openslaq" : "openslaq-dev";
    return c.json({ url: `https://vercel.com/integrations/${integrationSlug}/new?${params.toString()}` }, 200);
  })
  .openapi(connectRoute, async (c) => {
    if (!env.VERCEL_CLIENT_ID || !env.VERCEL_CLIENT_SECRET) {
      return c.json({ error: "Vercel integration is not configured" }, 503);
    }

    const workspace = c.get("workspace");
    const user = c.get("user");
    const { code, configurationId, teamId, teamSlug } = c.req.valid("json");

    // Check if already connected
    const existing = await getConnectionForWorkspace(workspace.id);
    if (existing) {
      return c.json({ error: "A Vercel team is already connected to this workspace" }, 409);
    }

    // Exchange code for access token (Vercel uses x-www-form-urlencoded)
    const tokenRes = await fetch("https://api.vercel.com/v2/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.VERCEL_CLIENT_ID,
        client_secret: env.VERCEL_CLIENT_SECRET,
        code,
        redirect_uri: `${c.req.url.split("/api/")[0]}/api/integrations/vercel-bot/oauth/callback`,
      }),
    });

    if (!tokenRes.ok) {
      return c.json({ error: "Failed to exchange authorization code" }, 400);
    }

    const tokenData = (await tokenRes.json()) as { access_token: string; team_id?: string };

    await createConnection(
      workspace.id,
      teamId,
      teamSlug,
      configurationId,
      tokenData.access_token,
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
            vercelTeamId: connection.vercelTeamId,
            vercelTeamSlug: connection.vercelTeamSlug,
          }
        : null,
    }, 200);
  });

export default app;
