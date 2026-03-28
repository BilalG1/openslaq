import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { auth } from "../auth/middleware";
import { createWorkspaceSchema } from "./validation";
import { createWorkspace, getWorkspacesForUser, getOwnedWorkspaceCount, quotas } from "./service";
import { rlWorkspaceCreate, rlRead } from "../rate-limit";
import { workspaceWithRoleSchema, workspaceSchema, errorSchema } from "../openapi/schemas";
import { jsonResponse } from "../openapi/responses";
import { BEARER_SECURITY, jsonBody, jsonContent } from "../lib/openapi-helpers";
import { BadRequestError } from "../errors";
import { getAuthContext } from "../lib/context";

const listWorkspacesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Workspaces"],
  summary: "List workspaces",
  description: "Returns all workspaces the authenticated user is a member of.",
  security: BEARER_SECURITY,
  middleware: [auth, rlRead] as const,
  responses: {
    200: jsonContent(z.array(workspaceWithRoleSchema), "List of workspaces with user roles"),
  },
});

const createWorkspaceRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Workspaces"],
  summary: "Create workspace",
  description: "Creates a new workspace and makes the authenticated user the owner.",
  security: BEARER_SECURITY,
  middleware: [auth, rlWorkspaceCreate] as const,
  request: {
    body: jsonBody(createWorkspaceSchema),
  },
  responses: {
    201: jsonContent(workspaceSchema, "Created workspace"),
    400: jsonContent(errorSchema, "Quota exceeded"),
  },
});

const app = new OpenAPIHono()
  .openapi(listWorkspacesRoute, async (c) => {
    const { user } = getAuthContext(c);
    const workspaces = await getWorkspacesForUser(user.id);
    return jsonResponse(c, workspaces, 200);
  })
  .openapi(createWorkspaceRoute, async (c) => {
    const { user } = getAuthContext(c);
    const { name } = c.req.valid("json");

    const ownedCount = await getOwnedWorkspaceCount(user.id);
    if (ownedCount >= quotas.maxWorkspacesPerUser) {
      throw new BadRequestError(`Maximum ${quotas.maxWorkspacesPerUser} workspaces per user`);
    }

    const result = await createWorkspace(name, user.id);
    if (!result) {
      throw new Error("Failed to generate unique workspace slug");
    }

    return jsonResponse(c, result, 201);
  });

export default app;
