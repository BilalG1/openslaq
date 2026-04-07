import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { asUserId } from "@openslaq/shared";
import { createDmSchema } from "./validation";
import { BEARER_SECURITY, jsonBody, jsonContent } from "../lib/openapi-helpers";
import { getOrCreateDm, listDms } from "./service";
import { getUserById } from "../users/service";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { rlRead } from "../rate-limit";
import { dmChannelResponseSchema, dmListItemSchema, errorSchema } from "../openapi/schemas";
import { jsonResponse } from "../openapi/responses";
import { BadRequestError } from "../errors";
import { getWorkspaceMemberContext } from "../lib/context";
import { emitToUser } from "../lib/emit";

const createDmRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["DMs"],
  summary: "Get or create DM channel",
  description: "Gets an existing DM channel with the specified user, or creates one.",
  security: BEARER_SECURITY,
  middleware: [rlRead] as const,
  request: {
    body: jsonBody(createDmSchema),
  },
  responses: {
    200: jsonContent(dmChannelResponseSchema, "Existing DM channel"),
    201: jsonContent(dmChannelResponseSchema, "Newly created DM channel"),
    400: jsonContent(errorSchema, "User is not a workspace member"),
  },
});

const listDmsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["DMs"],
  summary: "List DM channels",
  description: "Returns all DM channels for the authenticated user in this workspace.",
  security: BEARER_SECURITY,
  middleware: [rlRead] as const,
  responses: {
    200: jsonContent(z.array(dmListItemSchema), "List of DM channels"),
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(createDmRoute, async (c) => {
    const { user, workspace } = getWorkspaceMemberContext(c);
    const { userId: targetUserId } = c.req.valid("json");

    const result = await getOrCreateDm(workspace.id, user.id, asUserId(targetUserId));
    if (!result) {
      throw new BadRequestError("User is not a member of this workspace");
    }

    const body = { channel: result.channel, otherUser: result.otherUser };
    if (result.created) {
      // Notify the target user about the new DM (swap otherUser perspective)
      const currentUser = await getUserById(user.id);
      if (currentUser) {
        emitToUser(asUserId(targetUserId), "dm:created", {
          channel: result.channel,
          otherUser: { id: user.id, displayName: currentUser.displayName, avatarUrl: currentUser.avatarUrl },
        });
      }
      return jsonResponse(c, body, 201);
    }
    return jsonResponse(c, body, 200);
  })
  .openapi(listDmsRoute, async (c) => {
    const { user, workspace } = getWorkspaceMemberContext(c);
    const dms = await listDms(workspace.id, user.id);
    return jsonResponse(c, dms, 200);
  });

export default app;
