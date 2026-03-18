import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { requireRole } from "../workspaces/role-middleware";
import { ROLES } from "@openslaq/shared";
import { rlMemberManage, rlRead } from "../rate-limit";
import { errorSchema, okSchema } from "../openapi/schemas";
import { jsonResponse } from "../openapi/responses";
import {
  isInstalledInWorkspace,
  listInstalledInWorkspace,
  createAuthCode,
  uninstallListing,
  installInternalBot,
} from "./service";
import { db } from "../db";
import { marketplaceListings } from "./schema";
import { eq } from "drizzle-orm";
import { validateWebhookUrl } from "../bots/validate-url";

const installRoute = createRoute({
  method: "post",
  path: "/install",
  tags: ["Marketplace"],
  summary: "Install marketplace bot",
  description: "Installs a marketplace bot into the workspace.",
  security: [{ Bearer: [] }],
  middleware: [rlMemberManage, requireRole(ROLES.ADMIN)] as const,
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            listingId: z.string().describe("Marketplace listing ID"),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: okSchema } },
      description: "Installation initiated",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad request",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Listing not found",
    },
    403: {
      content: { "application/json": { schema: errorSchema } },
      description: "Insufficient permissions",
    },
    409: {
      content: { "application/json": { schema: errorSchema } },
      description: "Already installed",
    },
  },
});

const uninstallRoute = createRoute({
  method: "delete",
  path: "/:listingId/uninstall",
  tags: ["Marketplace"],
  summary: "Uninstall marketplace bot",
  description: "Removes a marketplace bot from the workspace.",
  security: [{ Bearer: [] }],
  middleware: [rlMemberManage, requireRole(ROLES.ADMIN)] as const,
  request: {
    params: z.object({ listingId: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: okSchema } },
      description: "Uninstalled",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Not found",
    },
  },
});

const installedRoute = createRoute({
  method: "get",
  path: "/installed",
  tags: ["Marketplace"],
  summary: "List installed marketplace bots",
  description: "Returns listing IDs of installed marketplace bots in this workspace.",
  security: [{ Bearer: [] }],
  middleware: [rlRead] as const,
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ installedListingIds: z.array(z.string()) }),
        },
      },
      description: "Installed listing IDs",
    },
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(installRoute, async (c) => {
    const workspace = c.get("workspace");
    const user = c.get("user");
    const { listingId } = c.req.valid("json");

    // Validate listing exists & is published
    const listing = await db.query.marketplaceListings.findFirst({
      where: eq(marketplaceListings.id, listingId),
    });
    if (!listing || !listing.published) {
      return c.json({ error: "Listing not found" }, 404);
    }

    // Check feature flag for gated integrations
    const { PLUGIN_SLUG_TO_FLAG, isIntegrationEnabled } = await import("../workspaces/feature-flags");
    if (listing.slug in PLUGIN_SLUG_TO_FLAG) {
      const enabled = await isIntegrationEnabled(workspace.id, listing.slug);
      if (!enabled) {
        return c.json({ error: "This integration is not enabled for this workspace" }, 403);
      }
    }

    // Check not already installed
    const alreadyInstalled = await isInstalledInWorkspace(listingId, workspace.id);
    if (alreadyInstalled) {
      return c.json({ error: "Already installed" }, 409);
    }

    // Internal bots (like github-bot) skip the OAuth dance
    const { getInternalBotSlugs } = await import("../integrations/registry");
    if (getInternalBotSlugs().includes(listing.slug)) {
      await installInternalBot(listing, workspace.id, user.id);
      return c.json({ ok: true as const }, 200);
    }

    // Create auth code
    const code = await createAuthCode(listingId, workspace.id, user.id);

    // Validate redirect URI against SSRF before fetching
    const urlCheck = validateWebhookUrl(listing.redirectUri);
    if (!urlCheck.ok) {
      return c.json({ error: `Invalid redirect URI: ${urlCheck.reason}` }, 400);
    }

    // Server-to-server: POST auth code to bot's callback in the background
    // Fire and forget — admin sees "Installed!" immediately
    fetch(listing.redirectUri, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, workspace_id: workspace.id }),
      signal: AbortSignal.timeout(5000),
    }).catch((err) => {
      console.error(`[marketplace] Failed to POST auth code to ${listing.redirectUri}:`, err);
    });

    return c.json({ ok: true as const }, 200);
  })
  .openapi(uninstallRoute, async (c) => {
    const workspace = c.get("workspace");
    const { listingId } = c.req.valid("param");
    const removed = await uninstallListing(listingId, workspace.id);
    if (!removed) return c.json({ error: "Not found" }, 404);
    return c.json({ ok: true as const }, 200);
  })
  .openapi(installedRoute, async (c) => {
    const workspace = c.get("workspace");
    const installedListingIds = await listInstalledInWorkspace(workspace.id);
    return jsonResponse(c, { installedListingIds }, 200);
  });

export default app;
