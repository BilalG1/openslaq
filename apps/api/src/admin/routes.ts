import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { auth } from "../auth/middleware";
import { isAdmin, requireAdmin } from "./middleware";
import { paginationSchema, activityQuerySchema } from "./validation";
import { getStats, getActivity, getUsers, getWorkspaces, createImpersonationSnippet, bulkUpdateFeatureFlag } from "./service";
import { getFeatureFlags, updateFeatureFlags } from "../workspaces/feature-flags";
import { db } from "../db";
import { workspaces } from "../workspaces/schema";
import { eq } from "drizzle-orm";
import { env } from "../env";

const app = new Hono()
  .use(auth)
  .get("/check", async (c) => {
    const user = c.get("user");
    return c.json({ isAdmin: isAdmin(user.id) });
  })
  .use(requireAdmin)
  .get("/stats", async (c) => {
    const stats = await getStats();
    return c.json(stats);
  })
  .get("/activity", zValidator("query", activityQuerySchema), async (c) => {
    const { days } = c.req.valid("query");
    const activity = await getActivity(days);
    return c.json(activity);
  })
  .get("/users", zValidator("query", paginationSchema), async (c) => {
    const params = c.req.valid("query");
    const result = await getUsers(params);
    return c.json(result);
  })
  .get("/workspaces", zValidator("query", paginationSchema), async (c) => {
    const params = c.req.valid("query");
    const result = await getWorkspaces(params);
    return c.json(result);
  })
  .get(
    "/workspaces/:workspaceId/feature-flags",
    zValidator("param", z.object({ workspaceId: z.string() })),
    async (c) => {
      const { workspaceId } = c.req.valid("param");
      // Verify workspace exists
      const [ws] = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
      if (!ws) return c.json({ error: "Workspace not found" }, 404);
      const flags = await getFeatureFlags(workspaceId);
      return c.json(flags);
    },
  )
  .patch(
    "/workspaces/:workspaceId/feature-flags",
    zValidator("param", z.object({ workspaceId: z.string() })),
    zValidator(
      "json",
      z.object({
        integrationGithub: z.boolean().optional(),
        integrationLinear: z.boolean().optional(),
        integrationSentry: z.boolean().optional(),
        integrationVercel: z.boolean().optional(),
      }),
    ),
    async (c) => {
      const { workspaceId } = c.req.valid("param");
      const body = c.req.valid("json");
      // Verify workspace exists
      const [ws] = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
      if (!ws) return c.json({ error: "Workspace not found" }, 404);
      const flags = await updateFeatureFlags(workspaceId, body);
      return c.json(flags);
    },
  )
  .post(
    "/feature-flags/bulk",
    zValidator(
      "json",
      z.object({
        flag: z.enum(["integrationGithub", "integrationLinear", "integrationSentry", "integrationVercel"]),
        enabled: z.boolean(),
      }),
    ),
    async (c) => {
      const { flag, enabled } = c.req.valid("json");
      const count = await bulkUpdateFeatureFlag(flag, enabled);
      return c.json({ updated: count });
    },
  )
  .post(
    "/impersonate/:userId",
    zValidator("param", z.object({ userId: z.string().regex(/^[a-zA-Z0-9_-]+$/) })),
    async (c) => {
      if (!env.STACK_SECRET_SERVER_KEY) {
        return c.json(
          { error: "Impersonation is unavailable — STACK_SECRET_SERVER_KEY is not configured" },
          503,
        );
      }
      const { userId } = c.req.valid("param");
      try {
        const snippet = await createImpersonationSnippet(
          userId,
          env.VITE_STACK_PROJECT_ID,
        );
        return c.json({ snippet });
      } catch (err) {
        console.error("Impersonation failed:", err);
        return c.json({ error: "Impersonation failed" }, 500);
      }
    },
  );

export default app;
