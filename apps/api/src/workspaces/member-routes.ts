import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq, and, ilike } from "drizzle-orm";
import { db } from "../db";
import { workspaceMembers } from "./schema";
import { users } from "../users/schema";
import { requireRole, type WorkspaceMemberEnv } from "./role-middleware";
import { requireScope } from "../auth/scope-middleware";
import { getWorkspaceMember, updateMemberRole, removeMember } from "./service";
import { ROLES } from "@openslaq/shared";
import type { UserId } from "@openslaq/shared";
import { rlRead } from "../rate-limit";
import { workspaceMemberSchema, okSchema, errorSchema } from "../openapi/schemas";
import { jsonResponse } from "../openapi/responses";
import { BEARER_SECURITY, jsonBody, jsonContent } from "../lib/openapi-helpers";
import { escapeLike } from "../lib/escape-like";
import { BadRequestError, ForbiddenError, NotFoundError } from "../errors";
import { getWorkspaceMemberContext } from "../lib/context";

const updateRoleSchema = z.object({
  role: z.enum(["admin", "member"]).describe("New role"),
});

const listMembersRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Workspaces"],
  summary: "List workspace members",
  description: "Returns all members of the workspace with their roles. Optionally filter by display name.",
  security: BEARER_SECURITY,
  middleware: [rlRead, requireScope("users:read")] as const,
  request: {
    query: z.object({
      q: z.string().optional().describe("Filter by display name (case-insensitive prefix match)"),
    }),
  },
  responses: {
    200: jsonContent(z.array(workspaceMemberSchema), "Workspace members"),
  },
});

const updateRoleRoute = createRoute({
  method: "patch",
  path: "/:userId/role",
  tags: ["Workspaces"],
  summary: "Update member role",
  description: "Updates a workspace member's role. Requires admin permissions.",
  security: BEARER_SECURITY,
  middleware: [rlRead, requireRole(ROLES.ADMIN)] as const,
  request: {
    params: z.object({ userId: z.string().describe("Target user ID") }),
    body: jsonBody(updateRoleSchema),
  },
  responses: {
    200: jsonContent(workspaceMemberSchema, "Updated member"),
    400: jsonContent(errorSchema, "Cannot change own role"),
    403: jsonContent(errorSchema, "Insufficient permissions"),
    404: jsonContent(errorSchema, "Member not found"),
  },
});

const getMemberRoute = createRoute({
  method: "get",
  path: "/:userId",
  tags: ["Workspaces"],
  summary: "Get workspace member",
  description: "Returns a single workspace member by user ID.",
  security: BEARER_SECURITY,
  middleware: [rlRead, requireScope("users:read")] as const,
  request: {
    params: z.object({ userId: z.string().describe("User ID") }),
  },
  responses: {
    200: jsonContent(workspaceMemberSchema, "Workspace member"),
    404: jsonContent(errorSchema, "Member not found"),
  },
});

const removeMemberRoute = createRoute({
  method: "delete",
  path: "/:userId",
  tags: ["Workspaces"],
  summary: "Remove member",
  description: "Removes a member from the workspace. Requires admin permissions.",
  security: BEARER_SECURITY,
  middleware: [rlRead, requireRole(ROLES.ADMIN)] as const,
  request: {
    params: z.object({ userId: z.string().describe("Target user ID") }),
  },
  responses: {
    200: jsonContent(okSchema, "Member removed"),
    400: jsonContent(errorSchema, "Cannot remove yourself"),
    403: jsonContent(errorSchema, "Insufficient permissions"),
    404: jsonContent(errorSchema, "Member not found"),
  },
});

const leaveWorkspaceRoute = createRoute({
  method: "post",
  path: "/leave",
  tags: ["Workspaces"],
  summary: "Leave workspace",
  description: "Allows the current user to leave the workspace. Owners cannot leave.",
  security: BEARER_SECURITY,
  middleware: [rlRead] as const,
  responses: {
    200: jsonContent(okSchema, "Left workspace"),
    400: jsonContent(errorSchema, "Owner cannot leave"),
  },
});

async function getMemberResponse(workspaceId: string, userId: string) {
  const rows = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
      avatarUrl: users.avatarUrl,
      role: workspaceMembers.role,
      createdAt: users.createdAt,
      joinedAt: workspaceMembers.joinedAt,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    joinedAt: row.joinedAt.toISOString(),
  };
}

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(listMembersRoute, async (c) => {
    const { workspace } = getWorkspaceMemberContext(c);
    const { q } = c.req.valid("query");

    const conditions = [eq(workspaceMembers.workspaceId, workspace.id)];
    if (q) {
      conditions.push(ilike(users.displayName, `%${escapeLike(q)}%`));
    }

    const members = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        avatarUrl: users.avatarUrl,
        role: workspaceMembers.role,
        createdAt: users.createdAt,
        joinedAt: workspaceMembers.joinedAt,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(and(...conditions));

    return jsonResponse(c, members.map((member) => ({
      ...member,
      createdAt: member.createdAt.toISOString(),
      joinedAt: member.joinedAt.toISOString(),
    })), 200);
  })
  .openapi(getMemberRoute, async (c) => {
    const { workspace } = getWorkspaceMemberContext(c);
    const targetUserId = c.req.valid("param").userId;
    const member = await getMemberResponse(workspace.id, targetUserId);
    if (!member) {
      throw new NotFoundError("Member");
    }
    return jsonResponse(c, member, 200);
  })
  .openapi(updateRoleRoute, async (c) => {
    const { workspace, user, memberRole } = getWorkspaceMemberContext(c);
    const targetUserId = c.req.valid("param").userId as UserId;
    const { role: newRole } = c.req.valid("json");

    if (targetUserId === user.id) {
      throw new BadRequestError("Cannot change your own role");
    }

    const targetMember = await getWorkspaceMember(workspace.id, targetUserId);
    if (!targetMember) {
      throw new NotFoundError("Member");
    }

    if (targetMember.role === ROLES.OWNER) {
      throw new ForbiddenError("Cannot change the owner's role");
    }

    if (memberRole === ROLES.ADMIN && targetMember.role === ROLES.ADMIN) {
      throw new ForbiddenError("Admins cannot change other admins' roles");
    }

    await updateMemberRole(workspace.id, targetUserId, newRole);
    const updated = await getMemberResponse(workspace.id, targetUserId);
    if (!updated) {
      throw new NotFoundError("Member");
    }
    return jsonResponse(c, updated, 200);
  })
  .openapi(removeMemberRoute, async (c) => {
    const { workspace, user, memberRole } = getWorkspaceMemberContext(c);
    const targetUserId = c.req.valid("param").userId as UserId;

    if (targetUserId === user.id) {
      throw new BadRequestError("Cannot remove yourself");
    }

    const targetMember = await getWorkspaceMember(workspace.id, targetUserId);
    if (!targetMember) {
      throw new NotFoundError("Member");
    }

    if (targetMember.role === ROLES.OWNER) {
      throw new ForbiddenError("Cannot remove the owner");
    }

    if (memberRole === ROLES.ADMIN && targetMember.role === ROLES.ADMIN) {
      throw new ForbiddenError("Admins cannot remove other admins");
    }

    await removeMember(workspace.id, targetUserId);
    return c.json({ ok: true as const }, 200);
  })
  .openapi(leaveWorkspaceRoute, async (c) => {
    const { workspace, user, memberRole } = getWorkspaceMemberContext(c);

    if (memberRole === ROLES.OWNER) {
      throw new BadRequestError("Workspace owner cannot leave. Transfer ownership or delete the workspace.");
    }

    await removeMember(workspace.id, user.id);
    return c.json({ ok: true as const }, 200);
  });

export default app;
