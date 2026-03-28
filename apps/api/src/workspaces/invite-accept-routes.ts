import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { auth } from "../auth/middleware";
import type { AuthEnv } from "../auth/types";
import { eq, and } from "drizzle-orm";
import { getInviteByCode, acceptInvite } from "./invite-service";
import { getWorkspaceById } from "./service";
import { workspaceMembers } from "./schema";
import { db } from "../db";
import { asWorkspaceId } from "@openslaq/shared";
import { rlInvitePreview, rlInviteAccept } from "../rate-limit";
import { invitePreviewSchema, inviteAcceptSchema, errorSchema } from "../openapi/schemas";
import { BEARER_SECURITY, jsonContent } from "../lib/openapi-helpers";
import { NotFoundError, GoneError } from "../errors";
import { getAuthContext } from "../lib/context";

const previewInviteRoute = createRoute({
  method: "get",
  path: "/:code",
  tags: ["Invites"],
  summary: "Preview invite",
  description: "Returns workspace info for an invite code without accepting it.",
  security: BEARER_SECURITY,
  middleware: [rlInvitePreview, auth] as const,
  request: {
    params: z.object({ code: z.string().describe("Invite code") }),
  },
  responses: {
    200: jsonContent(invitePreviewSchema, "Invite preview"),
    404: jsonContent(errorSchema, "Invite not found"),
    410: jsonContent(errorSchema, "Invite revoked, expired, or max uses reached"),
  },
});

const acceptInviteRoute = createRoute({
  method: "post",
  path: "/:code/accept",
  tags: ["Invites"],
  summary: "Accept invite",
  description: "Accepts a workspace invite and joins the workspace.",
  security: BEARER_SECURITY,
  middleware: [rlInviteAccept, auth] as const,
  request: {
    params: z.object({ code: z.string().describe("Invite code") }),
  },
  responses: {
    200: jsonContent(inviteAcceptSchema, "Invite accepted"),
    404: jsonContent(errorSchema, "Invite not found"),
    410: jsonContent(errorSchema, "Invite revoked, expired, or max uses reached"),
  },
});

const app = new OpenAPIHono<AuthEnv>()
  .openapi(previewInviteRoute, async (c) => {
    const { code } = c.req.valid("param");
    const { user } = getAuthContext(c);
    const invite = await getInviteByCode(code);

    if (!invite) throw new NotFoundError("Invite");
    if (invite.revokedAt) throw new GoneError("Invite has been revoked");
    if (invite.expiresAt && invite.expiresAt < new Date())
      throw new GoneError("Invite has expired");
    if (invite.maxUses && invite.useCount >= invite.maxUses)
      throw new GoneError("Invite has reached maximum uses");

    const workspace = await getWorkspaceById(asWorkspaceId(invite.workspaceId));
    if (!workspace) throw new NotFoundError("Workspace");

    const existingMember = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, invite.workspaceId),
        eq(workspaceMembers.userId, user.id),
      ),
    });

    return c.json({ workspaceName: workspace.name, workspaceSlug: workspace.slug, alreadyMember: !!existingMember }, 200);
  })
  .openapi(acceptInviteRoute, async (c) => {
    const { code } = c.req.valid("param");
    const { user } = getAuthContext(c);

    const result = await acceptInvite(code, user.id);
    return c.json({ slug: result.workspace.slug }, 200);
  });

export default app;
