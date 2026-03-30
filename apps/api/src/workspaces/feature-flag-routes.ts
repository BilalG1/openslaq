import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { WorkspaceMemberEnv } from "./role-middleware";
import { rlRead } from "../rate-limit";
import { BEARER_SECURITY, jsonContent } from "../lib/openapi-helpers";
import { getFeatureFlags } from "./feature-flags";

const featureFlagsSchema = z.record(z.string(), z.string());

const getRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Feature Flags"],
  summary: "Get workspace feature flags",
  security: BEARER_SECURITY,
  middleware: [rlRead] as const,
  responses: {
    200: jsonContent(featureFlagsSchema, "Feature flags"),
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(getRoute, async (c) => {
    const workspace = c.get("workspace");
    const flags = await getFeatureFlags(workspace.id);
    return c.json(flags, 200);
  });

export default app;
