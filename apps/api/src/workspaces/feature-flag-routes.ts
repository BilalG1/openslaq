import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { WorkspaceMemberEnv } from "./role-middleware";
import { rlRead } from "../rate-limit";
import { getFeatureFlags } from "./feature-flags";

const featureFlagsSchema = z.object({
  integrationGithub: z.boolean(),
  integrationLinear: z.boolean(),
  integrationSentry: z.boolean(),
  integrationVercel: z.boolean(),
});

const getRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Feature Flags"],
  summary: "Get workspace feature flags",
  security: [{ Bearer: [] }],
  middleware: [rlRead] as const,
  responses: {
    200: {
      content: { "application/json": { schema: featureFlagsSchema } },
      description: "Feature flags",
    },
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(getRoute, async (c) => {
    const workspace = c.get("workspace");
    const flags = await getFeatureFlags(workspace.id);
    return c.json(flags, 200);
  });

export default app;
