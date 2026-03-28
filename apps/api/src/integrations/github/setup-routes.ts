import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { WorkspaceMemberEnv } from "../../workspaces/role-middleware";
import { BEARER_SECURITY, jsonBody, jsonContent } from "../../lib/openapi-helpers";
import { requireRole } from "../../workspaces/role-middleware";
import { ROLES } from "@openslaq/shared";
import { rlMemberManage } from "../../rate-limit";
import { okSchema, errorSchema } from "../../openapi/schemas";
import { ConflictError } from "../../errors";
import { createInstallation, getInstallationForWorkspace } from "./service";
import { getWorkspaceMemberContext } from "../../lib/context";

const linkInstallationRoute = createRoute({
  method: "post",
  path: "/installation",
  tags: ["GitHub"],
  summary: "Link GitHub App installation to workspace",
  description: "Links a GitHub App installation to the current workspace.",
  security: BEARER_SECURITY,
  middleware: [rlMemberManage, requireRole(ROLES.ADMIN)] as const,
  request: {
    body: jsonBody(z.object({
      installationId: z.string().describe("GitHub App installation ID"),
      accountLogin: z.string().describe("GitHub account login (org or user)"),
      accountType: z.string().describe("GitHub account type: Organization or User"),
    })),
  },
  responses: {
    200: jsonContent(okSchema, "Installation linked"),
    400: jsonContent(errorSchema, "Bad request"),
    409: jsonContent(errorSchema, "Already linked"),
  },
});

const getInstallationRoute = createRoute({
  method: "get",
  path: "/installation",
  tags: ["GitHub"],
  summary: "Get linked GitHub installation",
  description: "Returns the GitHub App installation linked to this workspace.",
  security: BEARER_SECURITY,
  middleware: [rlMemberManage] as const,
  responses: {
    200: jsonContent(z.object({
      installation: z
        .object({
          id: z.string(),
          githubInstallationId: z.string(),
          githubAccountLogin: z.string(),
          githubAccountType: z.string(),
        })
        .nullable(),
    }), "Installation info"),
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(linkInstallationRoute, async (c) => {
    const { user, workspace } = getWorkspaceMemberContext(c);
    const { installationId, accountLogin, accountType } = c.req.valid("json");

    // Check if already linked
    const existing = await getInstallationForWorkspace(workspace.id);
    if (existing) {
      throw new ConflictError("A GitHub installation is already linked to this workspace");
    }

    await createInstallation(
      workspace.id,
      installationId,
      accountLogin,
      accountType,
      user.id,
    );

    return c.json({ ok: true as const }, 200);
  })
  .openapi(getInstallationRoute, async (c) => {
    const workspace = c.get("workspace");
    const installation = await getInstallationForWorkspace(workspace.id);

    return c.json({
      installation: installation
        ? {
            id: installation.id,
            githubInstallationId: installation.githubInstallationId,
            githubAccountLogin: installation.githubAccountLogin,
            githubAccountType: installation.githubAccountType,
          }
        : null,
    }, 200);
  });

export default app;
