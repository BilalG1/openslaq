import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getUserThreads } from "./service";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { rlRead } from "../rate-limit";
import { messageSchema } from "../openapi/schemas";
import { jsonResponse } from "../openapi/responses";

const listUserThreadsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Messages"],
  summary: "List user threads",
  description: "Returns all threads the current user is participating in (authored or replied to).",
  security: [{ Bearer: [] }],
  middleware: [rlRead] as const,
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            threads: z.array(
              z.object({
                message: messageSchema,
                channelName: z.string(),
              }),
            ),
          }),
        },
      },
      description: "User threads",
    },
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(listUserThreadsRoute, async (c) => {
    const user = c.get("user");
    const workspace = c.get("workspace");
    const threads = await getUserThreads(user.id, workspace.id);
    return jsonResponse(c, { threads }, 200);
  });

export default app;
