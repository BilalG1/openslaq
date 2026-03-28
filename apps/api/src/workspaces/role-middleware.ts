import { createMiddleware } from "hono/factory";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { workspaceMembers } from "./schema";
import { hasMinimumRole } from "../auth/permissions";
import type { Role } from "@openslaq/shared";
import type { WorkspaceEnv } from "./types";
import { ForbiddenError } from "../errors";

export type WorkspaceMemberEnv = WorkspaceEnv & {
  Variables: WorkspaceEnv["Variables"] & {
    memberRole: Role;
  };
};

export const resolveMemberRole = createMiddleware<WorkspaceMemberEnv>(async (c, next) => {
  const workspace = c.get("workspace");
  const user = c.get("user");

  const row = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspace.id),
        eq(workspaceMembers.userId, user.id),
      ),
    )
    .limit(1);

  if (row.length === 0) {
    throw new ForbiddenError("Not a workspace member");
  }

  const [memberRow] = row;
  if (!memberRow) {
    throw new ForbiddenError("Not a workspace member");
  }

  c.set("memberRole", memberRow.role);
  await next();
});

export function requireRole(minimumRole: Role) {
  return createMiddleware<WorkspaceMemberEnv>(async (c, next) => {
    const memberRole = c.get("memberRole");
    if (!hasMinimumRole(memberRole, minimumRole)) {
      throw new ForbiddenError("Insufficient permissions");
    }
    await next();
  });
}
