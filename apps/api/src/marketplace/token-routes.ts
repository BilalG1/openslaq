import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { errorSchema } from "../openapi/schemas";
import { jsonResponse } from "../openapi/responses";
import { exchangeAuthCode } from "./service";
import { db } from "../db";
import { workspaces } from "../workspaces/schema";
import { eq } from "drizzle-orm";

const tokenExchangeRoute = createRoute({
  method: "post",
  path: "/token",
  tags: ["Marketplace"],
  summary: "Exchange auth code for API token",
  description: "Bot server exchanges an auth code for an API token (OAuth flow).",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            grant_type: z.literal("authorization_code"),
            code: z.string(),
            client_id: z.string(),
            client_secret: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            access_token: z.string(),
            token_type: z.literal("bearer"),
            bot_app_id: z.string(),
            workspace_id: z.string(),
            workspace_slug: z.string(),
          }),
        },
      },
      description: "Token issued",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Invalid request",
    },
    401: {
      content: { "application/json": { schema: errorSchema } },
      description: "Invalid credentials",
    },
  },
});

const app = new OpenAPIHono()
  .openapi(tokenExchangeRoute, async (c) => {
    const { grant_type, code, client_id, client_secret } = c.req.valid("json");

    if (grant_type !== "authorization_code") {
      return c.json({ error: "Unsupported grant_type" }, 400);
    }

    const result = await exchangeAuthCode(code, client_id, client_secret);
    if (!result) {
      return c.json({ error: "Invalid or expired auth code" }, 401);
    }

    // Look up workspace slug
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, result.workspaceId),
    });

    return jsonResponse(c, {
      access_token: result.accessToken,
      token_type: "bearer" as const,
      bot_app_id: result.botAppId,
      workspace_id: result.workspaceId,
      workspace_slug: workspace?.slug ?? "",
    }, 200);
  });

export default app;
