import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { searchQuerySchema } from "./validation";
import { BEARER_SECURITY, jsonContent } from "../lib/openapi-helpers";
import { searchMessages } from "./service";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { rlRead } from "../rate-limit";
import { searchResultsSchema } from "../openapi/schemas";
import { jsonResponse } from "../openapi/responses";
import { getWorkspaceMemberContext } from "../lib/context";

const searchRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Search"],
  summary: "Search messages",
  description: "Full-text search across messages in the workspace.",
  security: BEARER_SECURITY,
  middleware: [rlRead] as const,
  request: {
    query: searchQuerySchema,
  },
  responses: {
    200: jsonContent(searchResultsSchema, "Search results"),
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>().openapi(searchRoute, async (c) => {
  const { user, workspace } = getWorkspaceMemberContext(c);
  const params = c.req.valid("query");
  const result = await searchMessages(
    workspace.id,
    user.id,
    params,
  );
  return jsonResponse(c, result, 200);
});

export default app;
