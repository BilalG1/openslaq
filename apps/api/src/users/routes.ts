import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { auth } from "../auth/middleware";
import { requireScope } from "../auth/scope-middleware";
import { BEARER_SECURITY, jsonBody, jsonContent } from "../lib/openapi-helpers";
import { getUserById, updateUser, sanitizeUserStatus } from "./service";
import { rlProfileUpdate, rlRead } from "../rate-limit";
import { userSchema, errorSchema, okSchema } from "../openapi/schemas";
import { jsonResponse } from "../openapi/responses";
import { emitToWorkspace } from "../lib/emit";
import { getUserWorkspaceIds } from "../presence/service";
import { asUserId, asWorkspaceId } from "@openslaq/shared";
import { NotFoundError } from "../errors";

function toUserResponse(user: {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  statusEmoji: string | null;
  statusText: string | null;
  statusExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const status = sanitizeUserStatus(user);
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    statusEmoji: status.statusEmoji,
    statusText: status.statusText,
    statusExpiresAt: status.statusExpiresAt,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

const getMeRoute = createRoute({
  method: "get",
  path: "/me",
  tags: ["Users"],
  summary: "Get current user profile",
  description: "Returns the authenticated user's profile.",
  security: BEARER_SECURITY,
  middleware: [auth, rlRead, requireScope("users:read")] as const,
  responses: {
    200: jsonContent(userSchema, "User profile"),
    404: jsonContent(errorSchema, "User not found"),
  },
});

const updateMeRoute = createRoute({
  method: "patch",
  path: "/me",
  tags: ["Users"],
  summary: "Update current user profile",
  description: "Updates the authenticated user's display name and/or avatar.",
  security: BEARER_SECURITY,
  middleware: [auth, rlProfileUpdate] as const,
  request: {
    body: jsonBody(z.object({
      displayName: z.string().max(100).optional(),
      avatarUrl: z.string().nullable().optional(),
    })),
  },
  responses: {
    200: jsonContent(userSchema, "Updated user profile"),
    404: jsonContent(errorSchema, "User not found"),
  },
});

const setStatusRoute = createRoute({
  method: "put",
  path: "/me/status",
  tags: ["Users"],
  summary: "Set user status",
  description: "Sets the user's custom status emoji and text with optional expiration.",
  security: BEARER_SECURITY,
  middleware: [auth, rlProfileUpdate] as const,
  request: {
    body: jsonBody(z.object({
      emoji: z.string().max(32).optional(),
      text: z.string().max(100).optional(),
      expiresAt: z.string().datetime().nullable().optional(),
    })),
  },
  responses: {
    200: jsonContent(userSchema, "Updated user with status"),
    404: jsonContent(errorSchema, "User not found"),
  },
});

const clearStatusRoute = createRoute({
  method: "delete",
  path: "/me/status",
  tags: ["Users"],
  summary: "Clear user status",
  description: "Clears the user's custom status.",
  security: BEARER_SECURITY,
  middleware: [auth, rlProfileUpdate] as const,
  responses: {
    200: jsonContent(okSchema, "Status cleared"),
  },
});

async function broadcastProfileUpdate(
  userId: string,
  profile: { displayName: string; avatarUrl: string | null },
) {
  const workspaceIds = await getUserWorkspaceIds(userId);
  for (const wsId of workspaceIds) {
    emitToWorkspace(asWorkspaceId(wsId), "user:profileUpdated", {
      userId: asUserId(userId),
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
    });
  }
}

async function broadcastStatusUpdate(
  userId: string,
  status: { statusEmoji: string | null; statusText: string | null; statusExpiresAt: string | null },
) {
  const workspaceIds = await getUserWorkspaceIds(userId);
  for (const wsId of workspaceIds) {
    emitToWorkspace(asWorkspaceId(wsId), "user:statusUpdated", {
      userId: asUserId(userId),
      statusEmoji: status.statusEmoji,
      statusText: status.statusText,
      statusExpiresAt: status.statusExpiresAt,
    });
  }
}

const app = new OpenAPIHono()
  .openapi(getMeRoute, async (c) => {
    const authUser = c.get("user");
    const user = await getUserById(authUser.id);

    if (!user) {
      throw new NotFoundError("User");
    }

    return jsonResponse(c, toUserResponse(user), 200);
  })
  .openapi(updateMeRoute, async (c) => {
    const authUser = c.get("user");
    await updateUser(authUser.id, c.req.valid("json"));
    const user = await getUserById(authUser.id);
    if (!user) {
      throw new NotFoundError("User");
    }
    const response = toUserResponse(user);
    void broadcastProfileUpdate(authUser.id, {
      displayName: response.displayName,
      avatarUrl: response.avatarUrl,
    });
    return jsonResponse(c, response, 200);
  })
  .openapi(setStatusRoute, async (c) => {
    const authUser = c.get("user");
    const body = c.req.valid("json");
    await updateUser(authUser.id, {
      statusEmoji: body.emoji ?? null,
      statusText: body.text ?? null,
      statusExpiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    });
    const user = await getUserById(authUser.id);
    if (!user) {
      throw new NotFoundError("User");
    }
    const response = toUserResponse(user);
    void broadcastStatusUpdate(authUser.id, {
      statusEmoji: response.statusEmoji,
      statusText: response.statusText,
      statusExpiresAt: response.statusExpiresAt,
    });
    return jsonResponse(c, response, 200);
  })
  .openapi(clearStatusRoute, async (c) => {
    const authUser = c.get("user");
    await updateUser(authUser.id, {
      statusEmoji: null,
      statusText: null,
      statusExpiresAt: null,
    });
    void broadcastStatusUpdate(authUser.id, {
      statusEmoji: null,
      statusText: null,
      statusExpiresAt: null,
    });
    return jsonResponse(c, { ok: true as const }, 200);
  });

export default app;
