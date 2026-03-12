import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { auth } from "../auth/middleware";
import { getUserById, updateUser, sanitizeUserStatus } from "./service";
import { rlProfileUpdate, rlRead } from "../rate-limit";
import { userSchema, errorSchema, okSchema } from "../openapi/schemas";
import { jsonResponse } from "../openapi/responses";
import { getIO } from "../socket/io";
import { getUserWorkspaceIds } from "../presence/service";
import { asUserId } from "@openslaq/shared";

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
  security: [{ Bearer: [] }],
  middleware: [auth, rlRead] as const,
  responses: {
    200: { content: { "application/json": { schema: userSchema } }, description: "User profile" },
    404: { content: { "application/json": { schema: errorSchema } }, description: "User not found" },
  },
});

const updateMeRoute = createRoute({
  method: "patch",
  path: "/me",
  tags: ["Users"],
  summary: "Update current user profile",
  description: "Updates the authenticated user's display name and/or avatar.",
  security: [{ Bearer: [] }],
  middleware: [auth, rlProfileUpdate] as const,
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            displayName: z.string().max(100).optional(),
            avatarUrl: z.string().nullable().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: { content: { "application/json": { schema: userSchema } }, description: "Updated user profile" },
    404: { content: { "application/json": { schema: errorSchema } }, description: "User not found" },
  },
});

const setStatusRoute = createRoute({
  method: "put",
  path: "/me/status",
  tags: ["Users"],
  summary: "Set user status",
  description: "Sets the user's custom status emoji and text with optional expiration.",
  security: [{ Bearer: [] }],
  middleware: [auth, rlProfileUpdate] as const,
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            emoji: z.string().max(32).optional(),
            text: z.string().max(100).optional(),
            expiresAt: z.string().datetime().nullable().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: { content: { "application/json": { schema: userSchema } }, description: "Updated user with status" },
    404: { content: { "application/json": { schema: errorSchema } }, description: "User not found" },
  },
});

const clearStatusRoute = createRoute({
  method: "delete",
  path: "/me/status",
  tags: ["Users"],
  summary: "Clear user status",
  description: "Clears the user's custom status.",
  security: [{ Bearer: [] }],
  middleware: [auth, rlProfileUpdate] as const,
  responses: {
    200: { content: { "application/json": { schema: okSchema } }, description: "Status cleared" },
  },
});

async function broadcastStatusUpdate(
  userId: string,
  status: { statusEmoji: string | null; statusText: string | null; statusExpiresAt: string | null },
) {
  const io = getIO();
  const workspaceIds = await getUserWorkspaceIds(userId);
  for (const wsId of workspaceIds) {
    io.to(`workspace:${wsId}`).emit("user:statusUpdated", {
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
      return c.json({ error: "User not found" }, 404);
    }

    return jsonResponse(c, toUserResponse(user), 200);
  })
  .openapi(updateMeRoute, async (c) => {
    const authUser = c.get("user");
    await updateUser(authUser.id, c.req.valid("json"));
    const user = await getUserById(authUser.id);
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    return jsonResponse(c, toUserResponse(user), 200);
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
      return c.json({ error: "User not found" }, 404);
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
