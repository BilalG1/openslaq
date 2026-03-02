import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { createGroupDmSchema, addMemberSchema, renameGroupDmSchema } from "./validation";
import { createGroupDm, listGroupDms, addGroupDmMember, leaveGroupDm, renameGroupDm } from "./service";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { rlRead } from "../rate-limit";
import { groupDmResponseSchema, groupDmListItemSchema, groupDmMemberSchema, errorSchema, okSchema } from "../openapi/schemas";
import { jsonResponse, jsonOk } from "../openapi/responses";

const createGroupDmRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Group DMs"],
  summary: "Create group DM",
  description: "Creates a new group DM with the specified members, or returns an existing one with the same members.",
  security: [{ Bearer: [] }],
  middleware: [rlRead] as const,
  request: {
    body: { content: { "application/json": { schema: createGroupDmSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: groupDmResponseSchema } },
      description: "Existing group DM with same members",
    },
    201: {
      content: { "application/json": { schema: groupDmResponseSchema } },
      description: "Newly created group DM",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Validation error",
    },
  },
});

const listGroupDmsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Group DMs"],
  summary: "List group DMs",
  description: "Returns all group DM channels for the authenticated user in this workspace.",
  security: [{ Bearer: [] }],
  middleware: [rlRead] as const,
  responses: {
    200: {
      content: { "application/json": { schema: z.array(groupDmListItemSchema) } },
      description: "List of group DM channels",
    },
  },
});

const addMemberRoute = createRoute({
  method: "post",
  path: "/:channelId/members",
  tags: ["Group DMs"],
  summary: "Add member to group DM",
  description: "Adds a new member to an existing group DM.",
  security: [{ Bearer: [] }],
  middleware: [rlRead] as const,
  request: {
    body: { content: { "application/json": { schema: addMemberSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ members: z.array(groupDmMemberSchema) }) } },
      description: "Member added successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Validation error",
    },
  },
});

const leaveRoute = createRoute({
  method: "delete",
  path: "/:channelId/members/me",
  tags: ["Group DMs"],
  summary: "Leave group DM",
  description: "Removes the authenticated user from the group DM.",
  security: [{ Bearer: [] }],
  middleware: [rlRead] as const,
  responses: {
    200: {
      content: { "application/json": { schema: okSchema } },
      description: "Left successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Error",
    },
  },
});

const renameRoute = createRoute({
  method: "patch",
  path: "/:channelId",
  tags: ["Group DMs"],
  summary: "Rename group DM",
  description: "Updates the display name of a group DM.",
  security: [{ Bearer: [] }],
  middleware: [rlRead] as const,
  request: {
    body: { content: { "application/json": { schema: renameGroupDmSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: groupDmResponseSchema.pick({ channel: true }) } },
      description: "Renamed successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Error",
    },
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(createGroupDmRoute, async (c) => {
    const user = c.get("user");
    const workspace = c.get("workspace");
    const { memberIds } = c.req.valid("json");

    const result = await createGroupDm(workspace.id, user.id, memberIds);
    if ("error" in result) {
      return c.json({ error: result.error }, 400);
    }

    const body = { channel: result.channel, members: result.members };
    if (result.created) {
      return jsonResponse(c, body, 201);
    }
    return jsonResponse(c, body, 200);
  })
  .openapi(listGroupDmsRoute, async (c) => {
    const user = c.get("user");
    const workspace = c.get("workspace");
    const groupDms = await listGroupDms(workspace.id, user.id);
    return jsonResponse(c, groupDms, 200);
  })
  .openapi(addMemberRoute, async (c) => {
    const user = c.get("user");
    const workspace = c.get("workspace");
    const channelId = c.req.param("channelId");
    const { userId } = c.req.valid("json");

    const result = await addGroupDmMember(channelId, user.id, userId, workspace.id);
    if ("error" in result) {
      return c.json({ error: result.error }, 400);
    }

    return jsonResponse(c, { members: result.members }, 200);
  })
  .openapi(leaveRoute, async (c) => {
    const user = c.get("user");
    const workspace = c.get("workspace");
    const channelId = c.req.param("channelId");

    const result = await leaveGroupDm(channelId, user.id, workspace.id);
    if ("error" in result) {
      return c.json({ error: result.error }, 400);
    }

    return jsonOk(c);
  })
  .openapi(renameRoute, async (c) => {
    const user = c.get("user");
    const workspace = c.get("workspace");
    const channelId = c.req.param("channelId");
    const { displayName } = c.req.valid("json");

    const result = await renameGroupDm(channelId, user.id, displayName, workspace.id);
    if ("error" in result) {
      return c.json({ error: result.error }, 400);
    }

    return jsonResponse(c, { channel: result.channel }, 200);
  });

export default app;
