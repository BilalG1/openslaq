import { createMiddleware } from "hono/factory";
import { eq, and } from "drizzle-orm";
import { asMessageId, asChannelId } from "@openslaq/shared";
import type { Message } from "@openslaq/shared";
import type { AuthEnv } from "../auth/types";
import { getMessageById } from "./service";
import { isChannelMember, getChannelById } from "../channels/service";
import { db } from "../db";
import { workspaceMembers } from "../workspaces/schema";

export type MessageEnv = AuthEnv & {
  Variables: AuthEnv["Variables"] & {
    message: Message;
  };
};

export const requireMessageChannelAccess = createMiddleware<MessageEnv>(async (c, next) => {
  const idParam = c.req.param("id");
  if (!idParam) {
    return c.json({ error: "Message not found" }, 404);
  }
  const messageId = asMessageId(idParam);
  const user = c.get("user");

  const message = await getMessageById(messageId);
  if (!message) {
    return c.json({ error: "Message not found" }, 404);
  }

  const isMember = await isChannelMember(asChannelId(message.channelId), user.id);
  if (!isMember) {
    return c.json({ error: "Message not found" }, 404);
  }

  // Verify the channel belongs to a workspace the user is a member of
  const channel = await getChannelById(asChannelId(message.channelId));
  if (channel) {
    const wsMembership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, channel.workspaceId),
        eq(workspaceMembers.userId, user.id),
      ),
    });
    if (!wsMembership) {
      return c.json({ error: "Message not found" }, 404);
    }
  }

  c.set("message", message);
  await next();
});
