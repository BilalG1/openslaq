import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { BEARER_SECURITY, jsonContent } from "../lib/openapi-helpers";
import { getWorkspacePresence } from "./service";
import { rlRead } from "../rate-limit";
import { requireScope } from "../auth/scope-middleware";
import { presenceEntrySchema } from "../openapi/schemas";
import { z } from "@hono/zod-openapi";
import { jsonResponse } from "../openapi/responses";

const getPresenceRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Presence"],
  summary: "Get workspace presence",
  description: "Returns all online users in the workspace.",
  security: BEARER_SECURITY,
  middleware: [rlRead, requireScope("presence:read")] as const,
  responses: {
    200: jsonContent(z.array(presenceEntrySchema), "List of online users"),
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>().openapi(getPresenceRoute, async (c) => {
  const workspace = c.get("workspace");
  const presence = await getWorkspacePresence(workspace.id);
  return jsonResponse(c, presence, 200);
});

export default app;
