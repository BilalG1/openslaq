import type { Context } from "hono";
import type { AuthEnv } from "../auth/types";
import type { WorkspaceEnv } from "../workspaces/types";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import type { ChannelEnv } from "../channels/middleware";
import type { MessageEnv } from "../messages/middleware";

export function getAuthContext(c: Context<AuthEnv>) {
  return { user: c.get("user"), tokenMeta: c.get("tokenMeta") };
}

export function getWorkspaceContext(c: Context<WorkspaceEnv>) {
  return { user: c.get("user"), tokenMeta: c.get("tokenMeta"), workspace: c.get("workspace") };
}

export function getWorkspaceMemberContext(c: Context<WorkspaceMemberEnv>) {
  return {
    user: c.get("user"),
    tokenMeta: c.get("tokenMeta"),
    workspace: c.get("workspace"),
    memberRole: c.get("memberRole"),
  };
}

export function getChannelContext(c: Context<ChannelEnv>) {
  return {
    user: c.get("user"),
    tokenMeta: c.get("tokenMeta"),
    workspace: c.get("workspace"),
    memberRole: c.get("memberRole"),
    channel: c.get("channel"),
  };
}

export function getMessageContext(c: Context<MessageEnv>) {
  return { user: c.get("user"), tokenMeta: c.get("tokenMeta"), message: c.get("message") };
}
