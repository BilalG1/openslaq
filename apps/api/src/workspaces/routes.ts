import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { auth } from "../auth/middleware";
import { createWorkspaceSchema } from "./validation";
import { createWorkspace, getWorkspacesForUser, getOwnedWorkspaceCount, quotas } from "./service";
import { rlWorkspaceCreate, rlRead } from "../rate-limit";
import { workspaceWithRoleSchema, workspaceSchema, errorSchema } from "../openapi/schemas";
import { jsonResponse } from "../openapi/responses";

const listWorkspacesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Workspaces"],
  summary: "List workspaces",
  description: "Returns all workspaces the authenticated user is a member of.",
  security: [{ Bearer: [] }],
  middleware: [auth, rlRead] as const,
  responses: {
    200: {
      content: { "application/json": { schema: z.array(workspaceWithRoleSchema) } },
      description: "List of workspaces with user roles",
    },
  },
});

const createWorkspaceRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Workspaces"],
  summary: "Create workspace",
  description: "Creates a new workspace and makes the authenticated user the owner.",
  security: [{ Bearer: [] }],
  middleware: [auth, rlWorkspaceCreate] as const,
  request: {
    body: { content: { "application/json": { schema: createWorkspaceSchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: workspaceSchema } },
      description: "Created workspace",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Quota exceeded",
    },
  },
});

const app = new OpenAPIHono()
  .openapi(listWorkspacesRoute, async (c) => {
    const user = c.get("user");
    const workspaces = await getWorkspacesForUser(user.id);
    return jsonResponse(c, workspaces, 200);
  })
  .openapi(createWorkspaceRoute, async (c) => {
    const user = c.get("user");
    const { name } = c.req.valid("json");

    const ownedCount = await getOwnedWorkspaceCount(user.id);
    if (ownedCount >= quotas.maxWorkspacesPerUser) {
      return c.json({ error: `Maximum ${quotas.maxWorkspacesPerUser} workspaces per user` }, 400);
    }

    const result = await createWorkspace(name, user.id);
    if (!result) {
      throw new Error("Failed to generate unique workspace slug");
    }

    return jsonResponse(c, result, 201);
  });

export default app;
