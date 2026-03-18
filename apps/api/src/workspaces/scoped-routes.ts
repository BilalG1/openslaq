import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { createMiddleware } from "hono/factory";
import { auth } from "../auth/middleware";
import { getWorkspaceBySlug, deleteWorkspace } from "./service";
import type { WorkspaceEnv } from "./types";
import { resolveMemberRole, requireRole, type WorkspaceMemberEnv } from "./role-middleware";
import { ROLES } from "@openslaq/shared";
import channelRoutes from "../channels/routes";
import channelMessageRoutes from "../messages/channel-routes";
import memberRoutes from "./member-routes";
import dmRoutes from "../dm/routes";
import inviteRoutes from "./invite-routes";
import unreadRoutes from "../channels/unread-routes";
import presenceRoutes from "../presence/routes";
import searchRoutes from "../search/routes";
import botAdminRoutes from "../bots/admin-routes";
import allUnreadsRoutes from "../channels/unreads-routes";
import groupDmRoutes from "../group-dm/routes";
import savedMessageRoutes from "../messages/saved-routes";
import scheduledMessageRoutes from "../messages/scheduled-routes";
import draftRoutes from "../messages/draft-routes";
import threadRoutes from "../messages/thread-routes";
import fileBrowserRoutes from "../uploads/file-browser-routes";
import customEmojiRoutes from "../emoji/routes";
import bookmarkRoutes from "../channels/bookmark-routes";
import commandRoutes from "../commands/routes";
import marketplaceInstallRoutes from "../marketplace/install-routes";
import { INTEGRATION_PLUGINS } from "../integrations/registry";
import { okSchema, errorSchema } from "../openapi/schemas";
import featureFlagRoutes from "./feature-flag-routes";
import { PLUGIN_SLUG_TO_FLAG, isIntegrationEnabled } from "./feature-flags";

const resolveWorkspace = createMiddleware<WorkspaceEnv>(async (c, next) => {
  const slug = c.req.param("slug");
  if (!slug) {
    return c.json({ error: "Workspace not found" }, 404);
  }
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    return c.json({ error: "Workspace not found" }, 404);
  }
  c.set("workspace", workspace);
  await next();
});

const deleteWorkspaceRoute = createRoute({
  method: "delete",
  path: "/",
  tags: ["Workspaces"],
  summary: "Delete workspace",
  description: "Deletes a workspace. Only the workspace owner can delete.",
  security: [{ Bearer: [] }],
  middleware: [requireRole(ROLES.OWNER)] as const,
  responses: {
    200: { content: { "application/json": { schema: okSchema } }, description: "Workspace deleted" },
    403: { content: { "application/json": { schema: errorSchema } }, description: "Insufficient permissions" },
    404: { content: { "application/json": { schema: errorSchema } }, description: "Workspace not found" },
  },
});

// Apply shared middleware without chaining (preserves OpenAPIHono type)
const app = new OpenAPIHono<WorkspaceMemberEnv>();
app.use(auth);
app.use(resolveWorkspace);
app.use(resolveMemberRole);

const routes = app
  .openapi(deleteWorkspaceRoute, async (c) => {
    const workspace = c.get("workspace");
    await deleteWorkspace(workspace.id);
    return c.json({ ok: true as const }, 200);
  })
  .route("/channels", channelRoutes)
  .route("/channels", channelMessageRoutes)
  .route("/channels", bookmarkRoutes)
  .route("/members", memberRoutes)
  .route("/dm", dmRoutes)
  .route("/invites", inviteRoutes)
  .route("/unread-counts", unreadRoutes)
  .route("/unreads", allUnreadsRoutes)
  .route("/presence", presenceRoutes)
  .route("/search", searchRoutes)
  .route("/group-dm", groupDmRoutes)
  .route("/saved-messages", savedMessageRoutes)
  .route("/scheduled-messages", scheduledMessageRoutes)
  .route("/drafts", draftRoutes)
  .route("/threads", threadRoutes)
  .route("/files", fileBrowserRoutes)
  .route("/emoji", customEmojiRoutes)
  .route("/commands", commandRoutes)
  .route("/marketplace", marketplaceInstallRoutes)
  .route("/feature-flags", featureFlagRoutes)
  .route("/", botAdminRoutes);

// Mount integration plugin setup routes (gated by feature flags)
for (const plugin of INTEGRATION_PLUGINS) {
  if (plugin.setupRoutes) {
    if (plugin.slug in PLUGIN_SLUG_TO_FLAG) {
      const gated = new OpenAPIHono<WorkspaceMemberEnv>();
      gated.use(async (c, next) => {
        const enabled = await isIntegrationEnabled(c.get("workspace").id, plugin.slug);
        if (!enabled) return c.json({ error: "Integration not enabled" }, 403);
        await next();
      });
      gated.route("/", plugin.setupRoutes);
      routes.route(`/integrations/${plugin.slug}`, gated);
    } else {
      routes.route(`/integrations/${plugin.slug}`, plugin.setupRoutes);
    }
  }
}

export default routes;
