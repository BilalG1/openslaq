import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getUserThreads } from "./service";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { rlRead } from "../rate-limit";
import { messageSchema } from "../openapi/schemas";
import { jsonResponse } from "../openapi/responses";
import { BEARER_SECURITY, jsonContent } from "../lib/openapi-helpers";
import { getWorkspaceMemberContext } from "../lib/context";

const listUserThreadsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Messages"],
  summary: "List user threads",
  description: "Returns all threads the current user is participating in (authored or replied to).",
  security: BEARER_SECURITY,
  middleware: [rlRead] as const,
  responses: {
    200: jsonContent(z.object({
      threads: z.array(
        z.object({
          message: messageSchema,
          channelName: z.string(),
        }),
      ),
    }), "User threads"),
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(listUserThreadsRoute, async (c) => {
    const { user, workspace } = getWorkspaceMemberContext(c);
    const threads = await getUserThreads(user.id, workspace.id);
    return jsonResponse(c, { threads }, 200);
  });

export default app;
