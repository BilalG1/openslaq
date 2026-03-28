import { createMiddleware } from "hono/factory";
import { asChannelId, CHANNEL_TYPES, ROLES } from "@openslaq/shared";
import type { Channel } from "@openslaq/shared";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { getChannelById, isChannelMember } from "./service";
import { hasMinimumRole } from "../auth/permissions";
import { NotFoundError, ForbiddenError } from "../errors";

export type ChannelEnv = WorkspaceMemberEnv & {
  Variables: WorkspaceMemberEnv["Variables"] & {
    channel: Channel;
  };
};

export const resolveChannel = createMiddleware<ChannelEnv>(async (c, next) => {
  const idParam = c.req.param("id");
  if (!idParam) {
    throw new NotFoundError("Channel");
  }
  const channelId = asChannelId(idParam);
  const workspace = c.get("workspace");

  const channel = await getChannelById(channelId);
  if (!channel || channel.workspaceId !== workspace.id) {
    throw new NotFoundError("Channel");
  }

  // For private channels and group DMs, hide from non-members (return 404, not 403)
  if (channel.type === CHANNEL_TYPES.PRIVATE || channel.type === CHANNEL_TYPES.GROUP_DM) {
    const user = c.get("user");
    const isMember = await isChannelMember(channel.id, user.id);
    if (!isMember) {
      throw new NotFoundError("Channel");
    }
  }

  c.set("channel", channel);
  await next();
});

export const requireChannelMember = createMiddleware<ChannelEnv>(async (c, next) => {
  const channel = c.get("channel");
  const user = c.get("user");

  const isMember = await isChannelMember(channel.id, user.id);
  if (!isMember) {
    throw new ForbiddenError("Not a channel member");
  }

  await next();
});

/** Requires user to be channel creator or workspace admin/owner. Only enforced on private channels. */
export const requirePrivateChannelAdmin = createMiddleware<ChannelEnv>(async (c, next) => {
  const channel = c.get("channel");
  if (channel.type !== CHANNEL_TYPES.PRIVATE) {
    await next();
    return;
  }

  const user = c.get("user");
  const memberRole = c.get("memberRole");

  const isCreator = channel.createdBy === user.id;
  const isWorkspaceAdmin = hasMinimumRole(memberRole, ROLES.ADMIN);

  if (!isCreator && !isWorkspaceAdmin) {
    throw new ForbiddenError("Only channel creator or workspace admin can manage members");
  }

  await next();
});
