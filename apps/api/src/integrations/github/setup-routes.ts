import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { WorkspaceMemberEnv } from "../../workspaces/role-middleware";
import { requireRole } from "../../workspaces/role-middleware";
import { ROLES } from "@openslaq/shared";
import { rlMemberManage } from "../../rate-limit";
import { okSchema, errorSchema } from "../../openapi/schemas";
import { createInstallation, getInstallationForWorkspace } from "./service";

const linkInstallationRoute = createRoute({
  method: "post",
  path: "/installation",
  tags: ["GitHub"],
  summary: "Link GitHub App installation to workspace",
  description: "Links a GitHub App installation to the current workspace.",
  security: [{ Bearer: [] }],
  middleware: [rlMemberManage, requireRole(ROLES.ADMIN)] as const,
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            installationId: z.string().describe("GitHub App installation ID"),
            accountLogin: z.string().describe("GitHub account login (org or user)"),
            accountType: z.string().describe("GitHub account type: Organization or User"),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: okSchema } },
      description: "Installation linked",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad request",
    },
    409: {
      content: { "application/json": { schema: errorSchema } },
      description: "Already linked",
    },
  },
});

const getInstallationRoute = createRoute({
  method: "get",
  path: "/installation",
  tags: ["GitHub"],
  summary: "Get linked GitHub installation",
  description: "Returns the GitHub App installation linked to this workspace.",
  security: [{ Bearer: [] }],
  middleware: [rlMemberManage] as const,
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            installation: z
              .object({
                id: z.string(),
                githubInstallationId: z.string(),
                githubAccountLogin: z.string(),
                githubAccountType: z.string(),
              })
              .nullable(),
          }),
        },
      },
      description: "Installation info",
    },
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(linkInstallationRoute, async (c) => {
    const workspace = c.get("workspace");
    const user = c.get("user");
    const { installationId, accountLogin, accountType } = c.req.valid("json");

    // Check if already linked
    const existing = await getInstallationForWorkspace(workspace.id);
    if (existing) {
      return c.json({ error: "A GitHub installation is already linked to this workspace" }, 409);
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
