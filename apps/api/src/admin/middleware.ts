import { createMiddleware } from "hono/factory";
import type { AuthEnv } from "../auth/types";
import { env } from "../env";
import { ForbiddenError } from "../errors";

const adminUserIds = new Set(
  env.ADMIN_USER_IDS.split(",")
    .map((id) => id.trim())
    .filter(Boolean),
);

export function isAdmin(userId: string): boolean {
  return adminUserIds.has(userId);
}

export const requireAdmin = createMiddleware<AuthEnv>(async (c, next) => {
  const user = c.get("user");
  if (!isAdmin(user.id)) {
    throw new ForbiddenError();
  }
  await next();
});
