import { createMiddleware } from "hono/factory";
import type { BotScope } from "@openslaq/shared";
import type { AuthEnv } from "./types";
import type { WorkspaceEnv } from "../workspaces/types";
import { ForbiddenError } from "../errors";

/**
 * Require a specific scope for the current token.
 * - JWT sessions (scopes = null): always passes (full access).
 * - API keys and bot tokens: must include the scope in their granted list.
 */
export function requireScope(scope: BotScope) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    const meta = c.get("tokenMeta");
    // null scopes = JWT with full access
    if (meta.scopes === null) {
      await next();
      return;
    }
    if (!meta.scopes.includes(scope)) {
      throw new ForbiddenError(`Missing required scope: ${scope}`);
    }
    await next();
  });
}

/**
 * Enforce that bot tokens can only access their own workspace.
 * Must be placed after resolveWorkspace in the middleware chain.
 * No-op for JWT and API key users.
 */
export const enforceBotWorkspace = createMiddleware<WorkspaceEnv>(async (c, next) => {
  const meta = c.get("tokenMeta");
  if (meta.botWorkspaceId) {
    const workspace = c.get("workspace");
    if (workspace.id !== meta.botWorkspaceId) {
      throw new ForbiddenError("Bot token cannot access this workspace");
    }
  }
  await next();
});
