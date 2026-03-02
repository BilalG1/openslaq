import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getSavedMessages, getSavedMessageIds } from "./saved-service";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { rlRead } from "../rate-limit";
import { messageSchema } from "../openapi/schemas";
import { jsonResponse } from "../openapi/responses";

const listSavedMessagesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Saved Messages"],
  summary: "List saved messages",
  description: "Returns all saved messages for the current user in this workspace.",
  security: [{ Bearer: [] }],
  middleware: [rlRead] as const,
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            messages: z.array(
              z.object({
                message: messageSchema,
                channelName: z.string(),
                savedAt: z.string(),
              }),
            ),
          }),
        },
      },
      description: "Saved messages",
    },
  },
});

const listSavedIdsRoute = createRoute({
  method: "get",
  path: "/ids",
  tags: ["Saved Messages"],
  summary: "List saved message IDs",
  description: "Returns IDs of all saved messages for the current user.",
  security: [{ Bearer: [] }],
  middleware: [rlRead] as const,
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ messageIds: z.array(z.string()) }),
        },
      },
      description: "Saved message IDs",
    },
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(listSavedMessagesRoute, async (c) => {
    const user = c.get("user");
    const workspace = c.get("workspace");
    const items = await getSavedMessages(user.id, workspace.id);
    return jsonResponse(c, { messages: items }, 200);
  })
  .openapi(listSavedIdsRoute, async (c) => {
    const user = c.get("user");
    const messageIds = await getSavedMessageIds(user.id);
    return jsonResponse(c, { messageIds }, 200);
  });

export default app;
