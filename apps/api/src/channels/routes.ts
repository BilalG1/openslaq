import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { createChannelSchema, addChannelMemberSchema, addChannelMembersBulkSchema, updateChannelSchema } from "./validation";
import { listChannels, createChannel, joinChannel, leaveChannel, listChannelMembers, addChannelMember, addChannelMembersBulk, removeChannelMember, browsePublicChannels, updateChannel, archiveChannel, unarchiveChannel } from "./service";
import { markChannelAsRead, markChannelAsUnread } from "./read-positions-service";
import { getStarredChannelIds, starChannel as starChannelService, unstarChannel as unstarChannelService } from "./starred-service";
import { getChannelNotificationPrefs, getChannelNotificationPref, setChannelNotificationPref } from "./notification-prefs-service";
import { resolveChannel, requireChannelMember, requirePrivateChannelAdmin } from "./middleware";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { requireScope } from "../auth/scope-middleware";
import { rlChannelCreate, rlChannelJoinLeave, rlMarkAsRead, rlRead, rlMemberManage } from "../rate-limit";
import { createChannelEventMessage } from "../messages/service";
import { hasMinimumRole } from "../auth/permissions";
import { ROLES, CHANNEL_TYPES, asUserId, asMessageId, zChannelId, zUserId } from "@openslaq/shared";
import type { ChannelNotifyLevel } from "@openslaq/shared";
import { getWorkspaceMember, getWorkspaceMembersByIds } from "../workspaces/service";
import { getIO } from "../socket/io";
import { emitToChannel, emitToWorkspace } from "../lib/emit";
import { getSocketIdsForUser } from "../presence/service";
import { channelSchema, browseChannelSchema, channelMemberSchema, okSchema, errorSchema } from "../openapi/schemas";
import { jsonResponse } from "../openapi/responses";
import { BEARER_SECURITY, jsonBody, jsonContent } from "../lib/openapi-helpers";
import { webhookDispatcher } from "../bots/webhook-dispatcher";
import { BadRequestError, ForbiddenError, NotFoundError } from "../errors";
import { getWorkspaceMemberContext, getChannelContext } from "../lib/context";

const channelIdParam = z.object({ id: zChannelId() });

const listChannelsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Channels"],
  summary: "List channels",
  description: "Returns all channels the user is a member of in this workspace.",
  security: BEARER_SECURITY,
  middleware: [rlRead, requireScope("channels:read")] as const,
  responses: {
    200: jsonContent(z.array(channelSchema), "List of channels"),
  },
});

const createChannelRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Channels"],
  summary: "Create channel",
  description: "Creates a new channel. Only admins can create private channels.",
  security: BEARER_SECURITY,
  middleware: [rlChannelCreate, requireScope("channels:write")] as const,
  request: {
    body: jsonBody(createChannelSchema),
  },
  responses: {
    201: jsonContent(channelSchema, "Created channel"),
    403: jsonContent(errorSchema, "Only admins can create private channels"),
  },
});

const browseChannelsRoute = createRoute({
  method: "get",
  path: "/browse",
  tags: ["Channels"],
  summary: "Browse public channels",
  description: "Returns all public channels in the workspace with membership status.",
  security: BEARER_SECURITY,
  middleware: [rlRead, requireScope("channels:read")] as const,
  request: {
    query: z.object({
      includeArchived: z.string().optional().describe("Set to 'true' to include archived channels"),
    }),
  },
  responses: {
    200: jsonContent(z.array(browseChannelSchema), "List of public channels with membership info"),
  },
});

const joinChannelRoute = createRoute({
  method: "post",
  path: "/:id/join",
  tags: ["Channels"],
  summary: "Join channel",
  description: "Joins a public channel.",
  security: BEARER_SECURITY,
  middleware: [rlChannelJoinLeave, requireScope("channels:join"), resolveChannel] as const,
  request: { params: channelIdParam },
  responses: {
    200: jsonContent(okSchema, "Joined"),
    403: jsonContent(errorSchema, "Cannot self-join a private channel"),
  },
});

const leaveChannelRoute = createRoute({
  method: "post",
  path: "/:id/leave",
  tags: ["Channels"],
  summary: "Leave channel",
  description: "Leaves a channel the user is a member of.",
  security: BEARER_SECURITY,
  middleware: [rlChannelJoinLeave, resolveChannel, requireChannelMember] as const,
  request: { params: channelIdParam },
  responses: {
    200: jsonContent(okSchema, "Left"),
  },
});

const listChannelMembersRoute = createRoute({
  method: "get",
  path: "/:id/members",
  tags: ["Channels"],
  summary: "List channel members",
  description: "Returns all members of a channel.",
  security: BEARER_SECURITY,
  middleware: [rlRead, requireScope("channels:members:read"), resolveChannel, requireChannelMember] as const,
  request: { params: channelIdParam },
  responses: {
    200: jsonContent(z.array(channelMemberSchema), "Channel members"),
  },
});

const addChannelMemberRoute = createRoute({
  method: "post",
  path: "/:id/members",
  tags: ["Channels"],
  summary: "Add channel member",
  description: "Adds a workspace member to the channel. Any channel member can add others.",
  security: BEARER_SECURITY,
  middleware: [rlMemberManage, requireScope("channels:members:write"), resolveChannel, requireChannelMember] as const,
  request: {
    params: channelIdParam,
    body: jsonBody(addChannelMemberSchema),
  },
  responses: {
    201: jsonContent(okSchema, "Member added"),
    400: jsonContent(errorSchema, "Target user is not a workspace member"),
  },
});

const addChannelMembersBulkRoute = createRoute({
  method: "post",
  path: "/:id/members/bulk",
  tags: ["Channels"],
  summary: "Bulk add channel members",
  description: "Adds multiple workspace members to the channel in a single request. Any channel member can add others.",
  security: BEARER_SECURITY,
  middleware: [rlMemberManage, requireScope("channels:members:write"), resolveChannel, requireChannelMember] as const,
  request: {
    params: channelIdParam,
    body: jsonBody(addChannelMembersBulkSchema),
  },
  responses: {
    201: jsonContent(z.object({ ok: z.literal(true), added: z.number() }), "Members added"),
    400: jsonContent(errorSchema, "No valid workspace members in the list"),
  },
});

const removeChannelMemberRoute = createRoute({
  method: "delete",
  path: "/:id/members/:userId",
  tags: ["Channels"],
  summary: "Remove channel member",
  description: "Removes a user from a private channel. Cannot remove the channel creator.",
  security: BEARER_SECURITY,
  middleware: [rlMemberManage, requireScope("channels:members:write"), resolveChannel, requireChannelMember, requirePrivateChannelAdmin] as const,
  request: {
    params: z.object({
      id: zChannelId(),
      userId: zUserId(),
    }),
  },
  responses: {
    200: jsonContent(okSchema, "Member removed"),
    400: jsonContent(errorSchema, "Cannot remove the channel creator"),
  },
});

const markReadRoute = createRoute({
  method: "post",
  path: "/:id/read",
  tags: ["Channels"],
  summary: "Mark channel as read",
  description: "Marks all messages in the channel as read for the authenticated user.",
  security: BEARER_SECURITY,
  middleware: [rlMarkAsRead, resolveChannel, requireChannelMember] as const,
  request: { params: channelIdParam },
  responses: {
    200: jsonContent(okSchema, "Marked as read"),
  },
});

const markUnreadRoute = createRoute({
  method: "post",
  path: "/:id/mark-unread",
  tags: ["Channels"],
  summary: "Mark channel as unread",
  description: "Moves the read position to just before a specific message, making it and all subsequent messages appear unread.",
  security: BEARER_SECURITY,
  middleware: [rlMarkAsRead, resolveChannel, requireChannelMember] as const,
  request: {
    params: channelIdParam,
    body: jsonBody(z.object({ messageId: z.string().describe("Message ID to mark as unread from") })),
  },
  responses: {
    200: jsonContent(z.object({
      ok: z.literal(true),
      unreadCount: z.number().describe("Number of unread messages after marking"),
    }), "Marked as unread"),
    404: jsonContent(errorSchema, "Message not found in channel"),
  },
});

const listStarredRoute = createRoute({
  method: "get",
  path: "/starred",
  tags: ["Channels"],
  summary: "List starred channels",
  description: "Returns the IDs of channels the user has starred.",
  security: BEARER_SECURITY,
  middleware: [rlRead] as const,
  responses: {
    200: jsonContent(z.array(z.string()), "List of starred channel IDs"),
  },
});

const starChannelRoute = createRoute({
  method: "post",
  path: "/:id/star",
  tags: ["Channels"],
  summary: "Star channel",
  description: "Stars a channel for the current user. Requires membership.",
  security: BEARER_SECURITY,
  middleware: [rlMemberManage, resolveChannel, requireChannelMember] as const,
  request: { params: channelIdParam },
  responses: {
    200: jsonContent(okSchema, "Starred"),
  },
});

const unstarChannelRoute = createRoute({
  method: "delete",
  path: "/:id/star",
  tags: ["Channels"],
  summary: "Unstar channel",
  description: "Removes a star from a channel for the current user.",
  security: BEARER_SECURITY,
  middleware: [rlMemberManage, resolveChannel] as const,
  request: { params: channelIdParam },
  responses: {
    200: jsonContent(okSchema, "Unstarred"),
  },
});

const updateChannelRoute = createRoute({
  method: "patch",
  path: "/:id",
  tags: ["Channels"],
  summary: "Update channel",
  description: "Updates a channel's description/topic. Any channel member can update.",
  security: BEARER_SECURITY,
  middleware: [rlMemberManage, resolveChannel, requireChannelMember] as const,
  request: {
    params: channelIdParam,
    body: jsonBody(updateChannelSchema),
  },
  responses: {
    200: jsonContent(channelSchema, "Updated channel"),
  },
});

const archiveChannelRoute = createRoute({
  method: "post",
  path: "/:id/archive",
  tags: ["Channels"],
  summary: "Archive channel",
  description: "Archives a channel, making it read-only. Requires workspace admin/owner role.",
  security: BEARER_SECURITY,
  middleware: [rlMemberManage, resolveChannel, requireChannelMember] as const,
  request: { params: channelIdParam },
  responses: {
    200: jsonContent(channelSchema, "Archived channel"),
    400: jsonContent(errorSchema, "Cannot archive #general"),
    403: jsonContent(errorSchema, "Only admins can archive channels"),
  },
});

const unarchiveChannelRoute = createRoute({
  method: "post",
  path: "/:id/unarchive",
  tags: ["Channels"],
  summary: "Unarchive channel",
  description: "Unarchives a channel, restoring normal functionality. Requires workspace admin/owner role.",
  security: BEARER_SECURITY,
  middleware: [rlMemberManage, resolveChannel] as const,
  request: { params: channelIdParam },
  responses: {
    200: jsonContent(channelSchema, "Unarchived channel"),
    403: jsonContent(errorSchema, "Only admins can unarchive channels"),
  },
});

const notifyLevelSchema = z.enum(["all", "mentions", "muted"]);

const listNotificationPrefsRoute = createRoute({
  method: "get",
  path: "/notification-prefs",
  tags: ["Channels"],
  summary: "List notification preferences",
  description: "Returns all non-default per-channel notification preferences for the current user.",
  security: BEARER_SECURITY,
  middleware: [rlRead] as const,
  responses: {
    200: jsonContent(z.record(z.string(), notifyLevelSchema), "Map of channel IDs to notification levels"),
  },
});

const getNotificationPrefRoute = createRoute({
  method: "get",
  path: "/:id/notification-pref",
  tags: ["Channels"],
  summary: "Get channel notification preference",
  description: "Returns the notification preference for a specific channel. Defaults to 'all'.",
  security: BEARER_SECURITY,
  middleware: [rlRead, resolveChannel, requireChannelMember] as const,
  request: { params: channelIdParam },
  responses: {
    200: jsonContent(z.object({ level: notifyLevelSchema }), "Notification level"),
  },
});

const setNotificationPrefRoute = createRoute({
  method: "put",
  path: "/:id/notification-pref",
  tags: ["Channels"],
  summary: "Set channel notification preference",
  description: "Sets the notification preference for a specific channel. Setting to 'all' removes the override.",
  security: BEARER_SECURITY,
  middleware: [rlMemberManage, resolveChannel, requireChannelMember] as const,
  request: {
    params: channelIdParam,
    body: jsonBody(z.object({ level: notifyLevelSchema })),
  },
  responses: {
    200: jsonContent(okSchema, "Preference saved"),
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(listChannelsRoute, async (c) => {
    const { workspace, user } = getWorkspaceMemberContext(c);
    const result = await listChannels(workspace.id, user.id);
    return jsonResponse(c, result, 200);
  })
  .openapi(browseChannelsRoute, async (c) => {
    const { workspace, user } = getWorkspaceMemberContext(c);
    const { includeArchived } = c.req.valid("query");
    const result = await browsePublicChannels(workspace.id, user.id, includeArchived === "true");
    return jsonResponse(c, result, 200);
  })
  .openapi(listStarredRoute, async (c) => {
    const { user, workspace } = getWorkspaceMemberContext(c);
    const ids = await getStarredChannelIds(user.id, workspace.id);
    return jsonResponse(c, ids, 200);
  })
  .openapi(listNotificationPrefsRoute, async (c) => {
    const { user, workspace } = getWorkspaceMemberContext(c);
    const prefs = await getChannelNotificationPrefs(user.id, workspace.id);
    return jsonResponse(c, prefs, 200);
  })
  .openapi(getNotificationPrefRoute, async (c) => {
    const { user, channel } = getChannelContext(c);
    const level = await getChannelNotificationPref(user.id, channel.id);
    return c.json({ level }, 200);
  })
  .openapi(setNotificationPrefRoute, async (c) => {
    const { user, channel } = getChannelContext(c);
    const { level } = c.req.valid("json");
    await setChannelNotificationPref(user.id, channel.id, level as ChannelNotifyLevel);
    return c.json({ ok: true as const }, 200);
  })
  .openapi(createChannelRoute, async (c) => {
    const { user, workspace } = getWorkspaceMemberContext(c);
    const { name, description, type } = c.req.valid("json");

    if (type === "private") {
      const memberRole = c.get("memberRole");
      if (!hasMinimumRole(memberRole, ROLES.ADMIN)) {
        throw new ForbiddenError("Only admins can create private channels");
      }
    }

    const channel = await createChannel(workspace.id, name, description, user.id, type);
    emitToWorkspace(workspace.id, "channel:created", { channel });
    return jsonResponse(c, channel, 201);
  })
  .openapi(joinChannelRoute, async (c) => {
    const { user, channel } = getChannelContext(c);

    if (channel.isArchived) {
      throw new ForbiddenError("Channel is archived");
    }

    if (channel.type === CHANNEL_TYPES.PRIVATE) {
      throw new ForbiddenError("Cannot self-join a private channel");
    }

    await joinChannel(channel.id, user.id);

    const joinMsg = await createChannelEventMessage(channel.id, user.id, { action: "joined" });
    emitToChannel(channel.id, "message:new", joinMsg);

    return c.json({ ok: true as const }, 200);
  })
  .openapi(leaveChannelRoute, async (c) => {
    const { user, channel } = getChannelContext(c);

    const leaveMsg = await createChannelEventMessage(channel.id, user.id, { action: "left" });
    emitToChannel(channel.id, "message:new", leaveMsg);
    emitToChannel(channel.id, "channel:member-removed", {
      channelId: channel.id,
      userId: user.id,
    });

    await leaveChannel(channel.id, user.id);

    // Remove the leaving user's sockets from the channel room
    const io = getIO();
    const socketIds = await getSocketIdsForUser(user.id);
    for (const sid of socketIds) {
      const socket = io.sockets.sockets.get(sid);
      if (socket) {
        socket.leave(`channel:${channel.id}`);
      }
    }

    return c.json({ ok: true as const }, 200);
  })
  .openapi(listChannelMembersRoute, async (c) => {
    const { channel } = getChannelContext(c);
    const members = await listChannelMembers(channel.id);
    return jsonResponse(c, members, 200);
  })
  .openapi(addChannelMemberRoute, async (c) => {
    const { channel, workspace } = getChannelContext(c);
    const targetUserId = asUserId(c.req.valid("json").userId);
    const targetMember = await getWorkspaceMember(workspace.id, targetUserId);
    if (!targetMember) {
      throw new BadRequestError("User is not a workspace member");
    }
    await addChannelMember(channel.id, targetUserId);

    emitToChannel(channel.id, "channel:member-added", {
      channelId: channel.id,
      userId: targetUserId,
    });
    webhookDispatcher.dispatch({
      type: "channel:member-added",
      channelId: channel.id,
      workspaceId: workspace.id,
      data: { channelId: channel.id, userId: targetUserId },
    });

    // Join the target user's sockets to the channel room
    const io = getIO();
    const socketIds = await getSocketIdsForUser(targetUserId);
    for (const sid of socketIds) {
      const socket = io.sockets.sockets.get(sid);
      if (socket) {
        socket.join(`channel:${channel.id}`);
      }
    }

    return c.json({ ok: true as const }, 201);
  })
  .openapi(addChannelMembersBulkRoute, async (c) => {
    const { channel, workspace } = getChannelContext(c);
    const { userIds } = c.req.valid("json");
    const targetUserIds = userIds.map(asUserId);

    // Filter to valid workspace members
    const validMembers = await getWorkspaceMembersByIds(workspace.id, targetUserIds);
    const validUserIds = validMembers.map((m) => asUserId(m.userId));
    if (validUserIds.length === 0) {
      throw new BadRequestError("No valid workspace members in the list");
    }

    await addChannelMembersBulk(channel.id, validUserIds);

    const io = getIO();
    for (const userId of validUserIds) {
      emitToChannel(channel.id, "channel:member-added", {
        channelId: channel.id,
        userId,
      });
      webhookDispatcher.dispatch({
        type: "channel:member-added",
        channelId: channel.id,
        workspaceId: workspace.id,
        data: { channelId: channel.id, userId },
      });

      const socketIds = await getSocketIdsForUser(userId);
      for (const sid of socketIds) {
        const socket = io.sockets.sockets.get(sid);
        if (socket) {
          socket.join(`channel:${channel.id}`);
        }
      }
    }

    return c.json({ ok: true as const, added: validUserIds.length }, 201);
  })
  .openapi(removeChannelMemberRoute, async (c) => {
    const { channel, workspace } = getChannelContext(c);
    const targetUserId = c.req.valid("param").userId;

    if (channel.createdBy === targetUserId) {
      throw new BadRequestError("Cannot remove the channel creator");
    }

    await removeChannelMember(channel.id, targetUserId);

    emitToChannel(channel.id, "channel:member-removed", {
      channelId: channel.id,
      userId: targetUserId,
    });
    webhookDispatcher.dispatch({
      type: "channel:member-removed",
      channelId: channel.id,
      workspaceId: workspace.id,
      data: { channelId: channel.id, userId: targetUserId },
    });

    // Remove the target user's sockets from the channel room
    const io = getIO();
    const socketIds = await getSocketIdsForUser(targetUserId);
    for (const sid of socketIds) {
      const socket = io.sockets.sockets.get(sid);
      if (socket) {
        socket.leave(`channel:${channel.id}`);
      }
    }

    return c.json({ ok: true as const }, 200);
  })
  .openapi(updateChannelRoute, async (c) => {
    const { channel, workspace } = getChannelContext(c);
    const { description } = c.req.valid("json");
    const updated = await updateChannel(channel.id, { description });

    emitToChannel(channel.id, "channel:updated", {
      channelId: channel.id,
      channel: updated,
    });
    emitToWorkspace(workspace.id, "channel:updated", {
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
    const { channel, workspace, memberRole } = getChannelContext(c);

    if (!hasMinimumRole(memberRole, ROLES.ADMIN)) {
      throw new ForbiddenError("Only admins can archive channels");
    }

    if (channel.name === "general" && channel.type === CHANNEL_TYPES.PUBLIC) {
      throw new BadRequestError("Cannot archive the #general channel");
    }

    const updated = await archiveChannel(channel.id);

    emitToChannel(channel.id, "channel:updated", {
      channelId: channel.id,
      channel: updated,
    });
    emitToWorkspace(workspace.id, "channel:updated", {
      channelId: channel.id,
      channel: updated,
    });

    return jsonResponse(c, updated, 200);
  })
  .openapi(unarchiveChannelRoute, async (c) => {
    const { channel, workspace, memberRole } = getChannelContext(c);

    if (!hasMinimumRole(memberRole, ROLES.ADMIN)) {
      throw new ForbiddenError("Only admins can unarchive channels");
    }

    const updated = await unarchiveChannel(channel.id);

    emitToChannel(channel.id, "channel:updated", {
      channelId: channel.id,
      channel: updated,
    });
    emitToWorkspace(workspace.id, "channel:updated", {
      channelId: channel.id,
      channel: updated,
    });

    return jsonResponse(c, updated, 200);
  })
  .openapi(starChannelRoute, async (c) => {
    const { user, channel } = getChannelContext(c);
    await starChannelService(user.id, channel.id);
    return c.json({ ok: true as const }, 200);
  })
  .openapi(unstarChannelRoute, async (c) => {
    const { user, channel } = getChannelContext(c);
    await unstarChannelService(user.id, channel.id);
    return c.json({ ok: true as const }, 200);
  })
  .openapi(markReadRoute, async (c) => {
    const { user, channel } = getChannelContext(c);
    await markChannelAsRead(user.id, channel.id);
    return c.json({ ok: true as const }, 200);
  })
  .openapi(markUnreadRoute, async (c) => {
    const { user, channel } = getChannelContext(c);
    const { messageId } = c.req.valid("json");
    const result = await markChannelAsUnread(user.id, channel.id, asMessageId(messageId));
    if (!result) {
      throw new NotFoundError("Message in this channel");
    }
    return c.json({ ok: true as const, unreadCount: result.unreadCount }, 200);
  });

export default app;
