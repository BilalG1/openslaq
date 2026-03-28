import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { errorSchema } from "../openapi/schemas";
import { jsonBody, jsonContent } from "../lib/openapi-helpers";
import { jsonResponse } from "../openapi/responses";
import { exchangeAuthCode } from "./service";
import { BadRequestError, UnauthorizedError } from "../errors";
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
    body: jsonBody(z.object({
      grant_type: z.literal("authorization_code"),
      code: z.string(),
      client_id: z.string(),
      client_secret: z.string(),
    })),
  },
  responses: {
    200: jsonContent(z.object({
      access_token: z.string(),
      token_type: z.literal("bearer"),
      bot_app_id: z.string(),
      workspace_id: z.string(),
      workspace_slug: z.string(),
    }), "Token issued"),
    400: jsonContent(errorSchema, "Invalid request"),
    401: jsonContent(errorSchema, "Invalid credentials"),
  },
});

const app = new OpenAPIHono()
  .openapi(tokenExchangeRoute, async (c) => {
    const { grant_type, code, client_id, client_secret } = c.req.valid("json");

    if (grant_type !== "authorization_code") {
      throw new BadRequestError("Unsupported grant_type");
    }

    const result = await exchangeAuthCode(code, client_id, client_secret);
    if (!result) {
      throw new UnauthorizedError("Invalid or expired auth code");
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
