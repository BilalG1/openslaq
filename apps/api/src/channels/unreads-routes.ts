import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { rlRead, rlMarkAsRead } from "../rate-limit";
import { getAllUnreads } from "./unreads-service";
import { markAllChannelsAsRead } from "./read-positions-service";
import { jsonResponse, jsonOk } from "../openapi/responses";
import { okSchema } from "../openapi/schemas";
import type { UserId, WorkspaceId } from "@openslaq/shared";
import { BEARER_SECURITY, jsonContent } from "../lib/openapi-helpers";
import { getWorkspaceMemberContext } from "../lib/context";

const allUnreadsResponseSchema = z.object({
  channels: z.array(z.object({
    channelId: z.string(),
    channelName: z.string(),
    channelType: z.enum(["public", "private", "dm", "group_dm"]),
    messages: z.array(z.any()),
  })),
  threadMentions: z.array(z.any()),
});

const getAllUnreadsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Channels"],
  summary: "Get all unread messages across channels",
  security: BEARER_SECURITY,
  middleware: [rlRead] as const,
  responses: {
    200: jsonContent(allUnreadsResponseSchema, "All unread messages grouped by channel"),
  },
});

const markAllReadRoute = createRoute({
  method: "post",
  path: "/mark-all-read",
  tags: ["Channels"],
  summary: "Mark all channels as read",
  security: BEARER_SECURITY,
  middleware: [rlMarkAsRead] as const,
  responses: {
    200: jsonContent(okSchema, "All channels marked as read"),
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(getAllUnreadsRoute, async (c) => {
    const { user, workspace } = getWorkspaceMemberContext(c);
    const result = await getAllUnreads(user.id as UserId, workspace.id as WorkspaceId);
    return jsonResponse(c, result, 200);
  })
  .openapi(markAllReadRoute, async (c) => {
    const { user, workspace } = getWorkspaceMemberContext(c);
    await markAllChannelsAsRead(user.id as UserId, workspace.id as WorkspaceId);
    return jsonOk(c);
  });

export default app;
