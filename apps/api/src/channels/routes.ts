import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { createChannelSchema, addChannelMemberSchema, updateChannelSchema } from "./validation";
import { listChannels, createChannel, joinChannel, leaveChannel, listChannelMembers, addChannelMember, removeChannelMember, browsePublicChannels, updateChannel, archiveChannel, unarchiveChannel } from "./service";
import { markChannelAsRead, markChannelAsUnread } from "./read-positions-service";
import { getStarredChannelIds, starChannel as starChannelService, unstarChannel as unstarChannelService } from "./starred-service";
import { getChannelNotificationPrefs, getChannelNotificationPref, setChannelNotificationPref } from "./notification-prefs-service";
import { resolveChannel, requireChannelMember, requirePrivateChannelAdmin } from "./middleware";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { rlChannelCreate, rlChannelJoinLeave, rlMarkAsRead, rlRead, rlMemberManage } from "../rate-limit";
import { hasMinimumRole } from "../auth/permissions";
import { ROLES, CHANNEL_TYPES, asUserId, asMessageId, zChannelId, zUserId } from "@openslaq/shared";
import type { ChannelNotifyLevel } from "@openslaq/shared";
import { getWorkspaceMember } from "../workspaces/service";
import { getIO } from "../socket/io";
import { getSocketIdsForUser } from "../presence/service";
import { channelSchema, browseChannelSchema, channelMemberSchema, okSchema, errorSchema } from "../openapi/schemas";
import { jsonResponse } from "../openapi/responses";
import { webhookDispatcher } from "../bots/webhook-dispatcher";

const channelIdParam = z.object({ id: zChannelId() });

const listChannelsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Channels"],
  summary: "List channels",
  description: "Returns all channels the user is a member of in this workspace.",
  security: [{ Bearer: [] }],
  middleware: [rlRead] as const,
  responses: {
    200: {
      content: { "application/json": { schema: z.array(channelSchema) } },
      description: "List of channels",
    },
  },
});

const createChannelRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Channels"],
  summary: "Create channel",
  description: "Creates a new channel. Only admins can create private channels.",
  security: [{ Bearer: [] }],
  middleware: [rlChannelCreate] as const,
  request: {
    body: { content: { "application/json": { schema: createChannelSchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: channelSchema } },
      description: "Created channel",
    },
    403: {
      content: { "application/json": { schema: errorSchema } },
      description: "Only admins can create private channels",
    },
  },
});

const browseChannelsRoute = createRoute({
  method: "get",
  path: "/browse",
  tags: ["Channels"],
  summary: "Browse public channels",
  description: "Returns all public channels in the workspace with membership status.",
  security: [{ Bearer: [] }],
  middleware: [rlRead] as const,
  request: {
    query: z.object({
      includeArchived: z.string().optional().describe("Set to 'true' to include archived channels"),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(browseChannelSchema) } },
      description: "List of public channels with membership info",
    },
  },
});

const joinChannelRoute = createRoute({
  method: "post",
  path: "/:id/join",
  tags: ["Channels"],
  summary: "Join channel",
  description: "Joins a public channel.",
  security: [{ Bearer: [] }],
  middleware: [rlChannelJoinLeave, resolveChannel] as const,
  request: { params: channelIdParam },
  responses: {
    200: { content: { "application/json": { schema: okSchema } }, description: "Joined" },
    403: { content: { "application/json": { schema: errorSchema } }, description: "Cannot self-join a private channel" },
  },
});

const leaveChannelRoute = createRoute({
  method: "post",
  path: "/:id/leave",
  tags: ["Channels"],
  summary: "Leave channel",
  description: "Leaves a channel the user is a member of.",
  security: [{ Bearer: [] }],
  middleware: [rlChannelJoinLeave, resolveChannel, requireChannelMember] as const,
  request: { params: channelIdParam },
  responses: {
    200: { content: { "application/json": { schema: okSchema } }, description: "Left" },
  },
});

const listChannelMembersRoute = createRoute({
  method: "get",
  path: "/:id/members",
  tags: ["Channels"],
  summary: "List channel members",
  description: "Returns all members of a channel.",
  security: [{ Bearer: [] }],
  middleware: [rlRead, resolveChannel, requireChannelMember] as const,
  request: { params: channelIdParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(channelMemberSchema) } },
      description: "Channel members",
    },
  },
});

const addChannelMemberRoute = createRoute({
  method: "post",
  path: "/:id/members",
  tags: ["Channels"],
  summary: "Add channel member",
  description: "Adds a user to a private channel. Requires channel creator or workspace admin role.",
  security: [{ Bearer: [] }],
  middleware: [rlMemberManage, resolveChannel, requireChannelMember, requirePrivateChannelAdmin] as const,
  request: {
    params: channelIdParam,
    body: { content: { "application/json": { schema: addChannelMemberSchema } } },
  },
  responses: {
    201: { content: { "application/json": { schema: okSchema } }, description: "Member added" },
    400: { content: { "application/json": { schema: errorSchema } }, description: "Target user is not a workspace member" },
  },
});

const removeChannelMemberRoute = createRoute({
  method: "delete",
  path: "/:id/members/:userId",
  tags: ["Channels"],
  summary: "Remove channel member",
  description: "Removes a user from a private channel. Cannot remove the channel creator.",
  security: [{ Bearer: [] }],
  middleware: [rlMemberManage, resolveChannel, requireChannelMember, requirePrivateChannelAdmin] as const,
  request: {
    params: z.object({
      id: zChannelId(),
      userId: zUserId(),
    }),
  },
  responses: {
    200: { content: { "application/json": { schema: okSchema } }, description: "Member removed" },
    400: { content: { "application/json": { schema: errorSchema } }, description: "Cannot remove the channel creator" },
  },
});

const markReadRoute = createRoute({
  method: "post",
  path: "/:id/read",
  tags: ["Channels"],
  summary: "Mark channel as read",
  description: "Marks all messages in the channel as read for the authenticated user.",
  security: [{ Bearer: [] }],
  middleware: [rlMarkAsRead, resolveChannel, requireChannelMember] as const,
  request: { params: channelIdParam },
  responses: {
    200: { content: { "application/json": { schema: okSchema } }, description: "Marked as read" },
  },
});

const markUnreadRoute = createRoute({
  method: "post",
  path: "/:id/mark-unread",
  tags: ["Channels"],
  summary: "Mark channel as unread",
  description: "Moves the read position to just before a specific message, making it and all subsequent messages appear unread.",
  security: [{ Bearer: [] }],
  middleware: [rlMarkAsRead, resolveChannel, requireChannelMember] as const,
  request: {
    params: channelIdParam,
    body: {
      content: {
        "application/json": {
          schema: z.object({ messageId: z.string().describe("Message ID to mark as unread from") }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            ok: z.literal(true),
            unreadCount: z.number().describe("Number of unread messages after marking"),
          }),
        },
      },
      description: "Marked as unread",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Message not found in channel",
    },
  },
});

const listStarredRoute = createRoute({
  method: "get",
  path: "/starred",
  tags: ["Channels"],
  summary: "List starred channels",
  description: "Returns the IDs of channels the user has starred.",
  security: [{ Bearer: [] }],
  middleware: [rlRead] as const,
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.string()) } },
      description: "List of starred channel IDs",
    },
  },
});

const starChannelRoute = createRoute({
  method: "post",
  path: "/:id/star",
  tags: ["Channels"],
  summary: "Star channel",
  description: "Stars a channel for the current user. Requires membership.",
  security: [{ Bearer: [] }],
  middleware: [rlMemberManage, resolveChannel, requireChannelMember] as const,
  request: { params: channelIdParam },
  responses: {
    200: { content: { "application/json": { schema: okSchema } }, description: "Starred" },
  },
});

const unstarChannelRoute = createRoute({
  method: "delete",
  path: "/:id/star",
  tags: ["Channels"],
  summary: "Unstar channel",
  description: "Removes a star from a channel for the current user.",
  security: [{ Bearer: [] }],
  middleware: [rlMemberManage, resolveChannel] as const,
  request: { params: channelIdParam },
  responses: {
    200: { content: { "application/json": { schema: okSchema } }, description: "Unstarred" },
  },
});

const updateChannelRoute = createRoute({
  method: "patch",
  path: "/:id",
  tags: ["Channels"],
  summary: "Update channel",
  description: "Updates a channel's description/topic. Any channel member can update.",
  security: [{ Bearer: [] }],
  middleware: [rlMemberManage, resolveChannel, requireChannelMember] as const,
  request: {
    params: channelIdParam,
    body: { content: { "application/json": { schema: updateChannelSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: channelSchema } },
      description: "Updated channel",
    },
  },
});

const archiveChannelRoute = createRoute({
  method: "post",
  path: "/:id/archive",
  tags: ["Channels"],
  summary: "Archive channel",
  description: "Archives a channel, making it read-only. Requires workspace admin/owner role.",
  security: [{ Bearer: [] }],
  middleware: [rlMemberManage, resolveChannel, requireChannelMember] as const,
  request: { params: channelIdParam },
  responses: {
    200: {
      content: { "application/json": { schema: channelSchema } },
      description: "Archived channel",
    },
    400: { content: { "application/json": { schema: errorSchema } }, description: "Cannot archive #general" },
    403: { content: { "application/json": { schema: errorSchema } }, description: "Only admins can archive channels" },
  },
});

const unarchiveChannelRoute = createRoute({
  method: "post",
  path: "/:id/unarchive",
  tags: ["Channels"],
  summary: "Unarchive channel",
  description: "Unarchives a channel, restoring normal functionality. Requires workspace admin/owner role.",
  security: [{ Bearer: [] }],
  middleware: [rlMemberManage, resolveChannel] as const,
  request: { params: channelIdParam },
  responses: {
    200: {
      content: { "application/json": { schema: channelSchema } },
      description: "Unarchived channel",
    },
    403: { content: { "application/json": { schema: errorSchema } }, description: "Only admins can unarchive channels" },
  },
});

const notifyLevelSchema = z.enum(["all", "mentions", "muted"]);

const listNotificationPrefsRoute = createRoute({
  method: "get",
  path: "/notification-prefs",
  tags: ["Channels"],
  summary: "List notification preferences",
  description: "Returns all non-default per-channel notification preferences for the current user.",
  security: [{ Bearer: [] }],
  middleware: [rlRead] as const,
  responses: {
    200: {
      content: { "application/json": { schema: z.record(z.string(), notifyLevelSchema) } },
      description: "Map of channel IDs to notification levels",
    },
  },
});

const getNotificationPrefRoute = createRoute({
  method: "get",
  path: "/:id/notification-pref",
  tags: ["Channels"],
  summary: "Get channel notification preference",
  description: "Returns the notification preference for a specific channel. Defaults to 'all'.",
  security: [{ Bearer: [] }],
  middleware: [rlRead, resolveChannel, requireChannelMember] as const,
  request: { params: channelIdParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ level: notifyLevelSchema }) } },
      description: "Notification level",
    },
  },
});

const setNotificationPrefRoute = createRoute({
  method: "put",
  path: "/:id/notification-pref",
  tags: ["Channels"],
  summary: "Set channel notification preference",
  description: "Sets the notification preference for a specific channel. Setting to 'all' removes the override.",
  security: [{ Bearer: [] }],
  middleware: [rlMemberManage, resolveChannel, requireChannelMember] as const,
  request: {
    params: channelIdParam,
    body: { content: { "application/json": { schema: z.object({ level: notifyLevelSchema }) } } },
  },
  responses: {
    200: { content: { "application/json": { schema: okSchema } }, description: "Preference saved" },
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(listChannelsRoute, async (c) => {
    const workspace = c.get("workspace");
    const user = c.get("user");
    const result = await listChannels(workspace.id, user.id);
    return jsonResponse(c, result, 200);
  })
  .openapi(browseChannelsRoute, async (c) => {
    const workspace = c.get("workspace");
    const user = c.get("user");
    const { includeArchived } = c.req.valid("query");
    const result = await browsePublicChannels(workspace.id, user.id, includeArchived === "true");
    return jsonResponse(c, result, 200);
  })
  .openapi(listStarredRoute, async (c) => {
    const user = c.get("user");
    const workspace = c.get("workspace");
    const ids = await getStarredChannelIds(user.id, workspace.id);
    return jsonResponse(c, ids, 200);
  })
  .openapi(listNotificationPrefsRoute, async (c) => {
    const user = c.get("user");
    const workspace = c.get("workspace");
    const prefs = await getChannelNotificationPrefs(user.id, workspace.id);
    return jsonResponse(c, prefs, 200);
  })
  .openapi(getNotificationPrefRoute, async (c) => {
    const user = c.get("user");
    const channel = c.get("channel");
    const level = await getChannelNotificationPref(user.id, channel.id);
    return c.json({ level }, 200);
  })
  .openapi(setNotificationPrefRoute, async (c) => {
    const user = c.get("user");
    const channel = c.get("channel");
    const { level } = c.req.valid("json");
    await setChannelNotificationPref(user.id, channel.id, level as ChannelNotifyLevel);
    return c.json({ ok: true as const }, 200);
  })
  .openapi(createChannelRoute, async (c) => {
    const user = c.get("user");
    const workspace = c.get("workspace");
    const { name, description, type } = c.req.valid("json");

    if (type === "private") {
      const memberRole = c.get("memberRole");
      if (!hasMinimumRole(memberRole, ROLES.ADMIN)) {
        return c.json({ error: "Only admins can create private channels" }, 403);
      }
    }

    const channel = await createChannel(workspace.id, name, description, user.id, type);
    return jsonResponse(c, channel, 201);
  })
  .openapi(joinChannelRoute, async (c) => {
    const user = c.get("user");
    const channel = c.get("channel");

    if (channel.isArchived) {
      return c.json({ error: "Channel is archived" }, 403);
    }

    if (channel.type === CHANNEL_TYPES.PRIVATE) {
      return c.json({ error: "Cannot self-join a private channel" }, 403);
    }

    await joinChannel(channel.id, user.id);
    return c.json({ ok: true as const }, 200);
  })
  .openapi(leaveChannelRoute, async (c) => {
    const user = c.get("user");
    const channel = c.get("channel");
    await leaveChannel(channel.id, user.id);
    return c.json({ ok: true as const }, 200);
  })
  .openapi(listChannelMembersRoute, async (c) => {
    const channel = c.get("channel");
    const members = await listChannelMembers(channel.id);
    return jsonResponse(c, members, 200);
  })
  .openapi(addChannelMemberRoute, async (c) => {
    const channel = c.get("channel");
    const workspace = c.get("workspace");
    const targetUserId = asUserId(c.req.valid("json").userId);
    const targetMember = await getWorkspaceMember(workspace.id, targetUserId);
    if (!targetMember) {
      return c.json({ error: "User is not a workspace member" }, 400);
    }
    await addChannelMember(channel.id, targetUserId);

    const io = getIO();
    io.to(`channel:${channel.id}`).emit("channel:member-added", {
      channelId: channel.id,
      userId: targetUserId,
    });
    webhookDispatcher.dispatch({
      type: "channel:member-added",
      channelId: channel.id,
      workspaceId: c.get("workspace").id,
      data: { channelId: channel.id, userId: targetUserId },
    });

    // Join the target user's sockets to the channel room
    const socketIds = getSocketIdsForUser(targetUserId);
    for (const sid of socketIds) {
      const socket = io.sockets.sockets.get(sid);
      if (socket) {
        socket.join(`channel:${channel.id}`);
      }
    }

    return c.json({ ok: true as const }, 201);
  })
  .openapi(removeChannelMemberRoute, async (c) => {
    const channel = c.get("channel");
    const targetUserId = c.req.valid("param").userId;

    if (channel.createdBy === targetUserId) {
      return c.json({ error: "Cannot remove the channel creator" }, 400);
    }

    await removeChannelMember(channel.id, targetUserId);

    const io = getIO();
    io.to(`channel:${channel.id}`).emit("channel:member-removed", {
      channelId: channel.id,
      userId: targetUserId,
    });
    webhookDispatcher.dispatch({
      type: "channel:member-removed",
      channelId: channel.id,
      workspaceId: c.get("workspace").id,
      data: { channelId: channel.id, userId: targetUserId },
    });

    // Remove the target user's sockets from the channel room
    const socketIds = getSocketIdsForUser(targetUserId);
    for (const sid of socketIds) {
      const socket = io.sockets.sockets.get(sid);
      if (socket) {
        socket.leave(`channel:${channel.id}`);
      }
    }

    return c.json({ ok: true as const }, 200);
  })
  .openapi(updateChannelRoute, async (c) => {
    const channel = c.get("channel");
    const workspace = c.get("workspace");
    const { description } = c.req.valid("json");
    const updated = await updateChannel(channel.id, { description });

    const io = getIO();
    io.to(`channel:${channel.id}`).emit("channel:updated", {
      channelId: channel.id,
      channel: updated,
    });
    io.to(`workspace:${workspace.id}`).emit("channel:updated", {
      channelId: channel.id,
      channel: updated,
    });
    webhookDispatcher.dispatch({
      type: "channel:updated",
      channelId: channel.id,
      workspaceId: workspace.id,
      data: { channelId: channel.id, channel: updated },
    });

    return jsonResponse(c, updated, 200);
  })
  .openapi(archiveChannelRoute, async (c) => {
    const channel = c.get("channel");
    const workspace = c.get("workspace");
    const memberRole = c.get("memberRole");

    if (!hasMinimumRole(memberRole, ROLES.ADMIN)) {
      return c.json({ error: "Only admins can archive channels" }, 403);
    }

    if (channel.name === "general" && channel.type === CHANNEL_TYPES.PUBLIC) {
      return c.json({ error: "Cannot archive the #general channel" }, 400);
    }

    const updated = await archiveChannel(channel.id);

    const io = getIO();
    io.to(`channel:${channel.id}`).emit("channel:updated", {
      channelId: channel.id,
      channel: updated,
    });
    io.to(`workspace:${workspace.id}`).emit("channel:updated", {
      channelId: channel.id,
      channel: updated,
    });

    return jsonResponse(c, updated, 200);
  })
  .openapi(unarchiveChannelRoute, async (c) => {
    const channel = c.get("channel");
    const workspace = c.get("workspace");
    const memberRole = c.get("memberRole");

    if (!hasMinimumRole(memberRole, ROLES.ADMIN)) {
      return c.json({ error: "Only admins can unarchive channels" }, 403);
    }

    const updated = await unarchiveChannel(channel.id);

    const io = getIO();
    io.to(`channel:${channel.id}`).emit("channel:updated", {
      channelId: channel.id,
      channel: updated,
    });
    io.to(`workspace:${workspace.id}`).emit("channel:updated", {
      channelId: channel.id,
      channel: updated,
    });

    return jsonResponse(c, updated, 200);
  })
  .openapi(starChannelRoute, async (c) => {
    const user = c.get("user");
    const channel = c.get("channel");
    await starChannelService(user.id, channel.id);
    return c.json({ ok: true as const }, 200);
  })
  .openapi(unstarChannelRoute, async (c) => {
    const user = c.get("user");
    const channel = c.get("channel");
    await unstarChannelService(user.id, channel.id);
    return c.json({ ok: true as const }, 200);
  })
  .openapi(markReadRoute, async (c) => {
    const user = c.get("user");
    const channel = c.get("channel");
    await markChannelAsRead(user.id, channel.id);
    return c.json({ ok: true as const }, 200);
  })
  .openapi(markUnreadRoute, async (c) => {
    const user = c.get("user");
    const channel = c.get("channel");
    const { messageId } = c.req.valid("json");
    const result = await markChannelAsUnread(user.id, channel.id, asMessageId(messageId));
    if (!result) {
      return c.json({ error: "Message not found in this channel" }, 404);
    }
    return c.json({ ok: true as const, unreadCount: result.unreadCount }, 200);
  });

export default app;
