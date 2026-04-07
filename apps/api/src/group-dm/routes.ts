import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { createGroupDmSchema, addMemberSchema, renameGroupDmSchema } from "./validation";
import { BEARER_SECURITY, jsonBody, jsonContent } from "../lib/openapi-helpers";
import { createGroupDm, listGroupDms, addGroupDmMember, leaveGroupDm, renameGroupDm } from "./service";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { rlRead } from "../rate-limit";
import { groupDmResponseSchema, groupDmListItemSchema, groupDmMemberSchema, errorSchema, okSchema } from "../openapi/schemas";
import { jsonResponse, jsonOk } from "../openapi/responses";
import { BadRequestError } from "../errors";
import { getWorkspaceMemberContext } from "../lib/context";
import { emitToUser } from "../lib/emit";
import { asUserId } from "@openslaq/shared";

const createGroupDmRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Group DMs"],
  summary: "Create group DM",
  description: "Creates a new group DM with the specified members, or returns an existing one with the same members.",
  security: BEARER_SECURITY,
  middleware: [rlRead] as const,
  request: {
    body: jsonBody(createGroupDmSchema),
  },
  responses: {
    200: jsonContent(groupDmResponseSchema, "Existing group DM with same members"),
    201: jsonContent(groupDmResponseSchema, "Newly created group DM"),
    400: jsonContent(errorSchema, "Validation error"),
  },
});

const listGroupDmsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Group DMs"],
  summary: "List group DMs",
  description: "Returns all group DM channels for the authenticated user in this workspace.",
  security: BEARER_SECURITY,
  middleware: [rlRead] as const,
  responses: {
    200: jsonContent(z.array(groupDmListItemSchema), "List of group DM channels"),
  },
});

const addMemberRoute = createRoute({
  method: "post",
  path: "/:channelId/members",
  tags: ["Group DMs"],
  summary: "Add member to group DM",
  description: "Adds a new member to an existing group DM.",
  security: BEARER_SECURITY,
  middleware: [rlRead] as const,
  request: {
    body: jsonBody(addMemberSchema),
  },
  responses: {
    200: jsonContent(z.object({ members: z.array(groupDmMemberSchema) }), "Member added successfully"),
    400: jsonContent(errorSchema, "Validation error"),
  },
});

const leaveRoute = createRoute({
  method: "delete",
  path: "/:channelId/members/me",
  tags: ["Group DMs"],
  summary: "Leave group DM",
  description: "Removes the authenticated user from the group DM.",
  security: BEARER_SECURITY,
  middleware: [rlRead] as const,
  responses: {
    200: jsonContent(okSchema, "Left successfully"),
    400: jsonContent(errorSchema, "Error"),
  },
});

const renameRoute = createRoute({
  method: "patch",
  path: "/:channelId",
  tags: ["Group DMs"],
  summary: "Rename group DM",
  description: "Updates the display name of a group DM.",
  security: BEARER_SECURITY,
  middleware: [rlRead] as const,
  request: {
    body: jsonBody(renameGroupDmSchema),
  },
  responses: {
    200: jsonContent(groupDmResponseSchema.pick({ channel: true }), "Renamed successfully"),
    400: jsonContent(errorSchema, "Error"),
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(createGroupDmRoute, async (c) => {
    const { user, workspace } = getWorkspaceMemberContext(c);
    const { memberIds } = c.req.valid("json");

    const result = await createGroupDm(workspace.id, user.id, memberIds);
    if ("error" in result) {
      throw new BadRequestError(result.error);
    }

    const body = { channel: result.channel, members: result.members };
    if (result.created) {
      // Notify all other members about the new group DM
      for (const member of result.members) {
        if (member.id !== user.id) {
          emitToUser(asUserId(member.id), "group-dm:created", {
            channel: result.channel,
            members: result.members,
          });
        }
      }
      return jsonResponse(c, body, 201);
    }
    return jsonResponse(c, body, 200);
  })
  .openapi(listGroupDmsRoute, async (c) => {
    const { user, workspace } = getWorkspaceMemberContext(c);
    const groupDms = await listGroupDms(workspace.id, user.id);
    return jsonResponse(c, groupDms, 200);
  })
  .openapi(addMemberRoute, async (c) => {
    const { user, workspace } = getWorkspaceMemberContext(c);
    const channelId = c.req.param("channelId");
    const { userId } = c.req.valid("json");

    const result = await addGroupDmMember(channelId, user.id, userId, workspace.id);
    if ("error" in result) {
      throw new BadRequestError(result.error);
    }

    return jsonResponse(c, { members: result.members }, 200);
  })
  .openapi(leaveRoute, async (c) => {
    const { user, workspace } = getWorkspaceMemberContext(c);
    const channelId = c.req.param("channelId");

    const result = await leaveGroupDm(channelId, user.id, workspace.id);
    if ("error" in result) {
      throw new BadRequestError(result.error);
    }

    return jsonOk(c);
  })
  .openapi(renameRoute, async (c) => {
    const { user, workspace } = getWorkspaceMemberContext(c);
    const channelId = c.req.param("channelId");
    const { displayName } = c.req.valid("json");

    const result = await renameGroupDm(channelId, user.id, displayName, workspace.id);
    if ("error" in result) {
      throw new BadRequestError(result.error);
    }

    return jsonResponse(c, { channel: result.channel }, 200);
  });

export default app;
