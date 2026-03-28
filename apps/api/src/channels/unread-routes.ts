import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { getUnreadCounts } from "./read-positions-service";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { rlRead } from "../rate-limit";
import { unreadCountsSchema } from "../openapi/schemas";
import { BEARER_SECURITY, jsonContent } from "../lib/openapi-helpers";
import { getWorkspaceMemberContext } from "../lib/context";

const getUnreadCountsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Channels"],
  summary: "Get unread message counts",
  description: "Returns unread message counts per channel for the authenticated user.",
  security: BEARER_SECURITY,
  middleware: [rlRead] as const,
  responses: {
    200: jsonContent(unreadCountsSchema, "Unread counts per channel"),
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>().openapi(getUnreadCountsRoute, async (c) => {
  const { user } = getWorkspaceMemberContext(c);
  const counts = await getUnreadCounts(user.id);
  return c.json(counts, 200);
});

export default app;
