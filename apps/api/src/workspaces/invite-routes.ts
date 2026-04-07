import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { createInviteSchema } from "./invite-validation";
import { createInvite, listInvites, revokeInvite } from "./invite-service";
import { requireRole, type WorkspaceMemberEnv } from "./role-middleware";
import { ROLES } from "@openslaq/shared";
import { rlInviteAdmin, rlRead } from "../rate-limit";
import { workspaceInviteSchema, okSchema, errorSchema } from "../openapi/schemas";
import { jsonResponse } from "../openapi/responses";
import { BEARER_SECURITY, jsonBody, jsonContent } from "../lib/openapi-helpers";
import { NotFoundError } from "../errors";
import { getWorkspaceMemberContext } from "../lib/context";

function toInviteResponse(invite: {
  id: string;
  workspaceId: string;
  code: string;
  createdBy: string;
  maxUses: number | null;
  useCount: number;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: invite.id,
    workspaceId: invite.workspaceId,
    code: invite.code,
    createdBy: invite.createdBy,
    maxUses: invite.maxUses,
    useCount: invite.useCount,
    expiresAt: invite.expiresAt?.toISOString() ?? null,
    revokedAt: invite.revokedAt?.toISOString() ?? null,
    createdAt: invite.createdAt.toISOString(),
  };
}

const listInvitesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Invites"],
  summary: "List workspace invites",
  description: "Returns all invites for the workspace.",
  security: BEARER_SECURITY,
  middleware: [requireRole(ROLES.MEMBER), rlRead] as const,
  responses: {
    200: jsonContent(z.array(workspaceInviteSchema), "Workspace invites"),
  },
});

const createInviteRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Invites"],
  summary: "Create invite",
  description: "Creates a new workspace invite link.",
  security: BEARER_SECURITY,
  middleware: [requireRole(ROLES.MEMBER), rlInviteAdmin] as const,
  request: {
    body: jsonBody(createInviteSchema),
  },
  responses: {
    201: jsonContent(workspaceInviteSchema, "Created invite"),
  },
});

const revokeInviteRoute = createRoute({
  method: "delete",
  path: "/:inviteId",
  tags: ["Invites"],
  summary: "Revoke invite",
  description: "Revokes a workspace invite. Requires admin permissions.",
  security: BEARER_SECURITY,
  middleware: [requireRole(ROLES.ADMIN), rlInviteAdmin] as const,
  request: {
    params: z.object({ inviteId: z.string().describe("Invite ID") }),
  },
  responses: {
    200: jsonContent(okSchema, "Invite revoked"),
    404: jsonContent(errorSchema, "Invite not found"),
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(listInvitesRoute, async (c) => {
    const { workspace } = getWorkspaceMemberContext(c);
    const invites = await listInvites(workspace.id);
    return jsonResponse(c, invites.map(toInviteResponse), 200);
  })
  .openapi(createInviteRoute, async (c) => {
    const { workspace, user } = getWorkspaceMemberContext(c);
    const { maxUses, expiresInHours } = c.req.valid("json");

    const invite = await createInvite(
      workspace.id,
      user.id,
      maxUses,
      expiresInHours,
    );

    return jsonResponse(c, toInviteResponse(invite), 201);
  })
  .openapi(revokeInviteRoute, async (c) => {
    const { workspace } = getWorkspaceMemberContext(c);
    const { inviteId } = c.req.valid("param");

    const revoked = await revokeInvite(inviteId, workspace.id);
    if (!revoked) {
      throw new NotFoundError("Invite");
    }

    return c.json({ ok: true as const }, 200);
  });

export default app;
