import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getSavedMessages, getSavedMessageIds } from "./saved-service";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { rlRead } from "../rate-limit";
import { messageSchema } from "../openapi/schemas";
import { jsonResponse } from "../openapi/responses";
import { BEARER_SECURITY, jsonContent } from "../lib/openapi-helpers";
import { getWorkspaceMemberContext } from "../lib/context";

const listSavedMessagesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Saved Messages"],
  summary: "List saved messages",
  description: "Returns all saved messages for the current user in this workspace.",
  security: BEARER_SECURITY,
  middleware: [rlRead] as const,
  responses: {
    200: jsonContent(z.object({
      messages: z.array(
        z.object({
          message: messageSchema,
          channelName: z.string(),
          savedAt: z.string(),
        }),
      ),
    }), "Saved messages"),
  },
});

const listSavedIdsRoute = createRoute({
  method: "get",
  path: "/ids",
  tags: ["Saved Messages"],
  summary: "List saved message IDs",
  description: "Returns IDs of all saved messages for the current user.",
  security: BEARER_SECURITY,
  middleware: [rlRead] as const,
  responses: {
    200: jsonContent(z.object({ messageIds: z.array(z.string()) }), "Saved message IDs"),
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(listSavedMessagesRoute, async (c) => {
    const { user, workspace } = getWorkspaceMemberContext(c);
    const items = await getSavedMessages(user.id, workspace.id);
    return jsonResponse(c, { messages: items }, 200);
  })
  .openapi(listSavedIdsRoute, async (c) => {
    const { user } = getWorkspaceMemberContext(c);
    const messageIds = await getSavedMessageIds(user.id);
    return jsonResponse(c, { messageIds }, 200);
  });

export default app;
