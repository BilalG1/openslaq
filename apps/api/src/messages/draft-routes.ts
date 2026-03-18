import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { rlRead, rlMessageSend } from "../rate-limit";
import { jsonResponse } from "../openapi/responses";
import { errorSchema, okSchema } from "../openapi/schemas";
import {
  upsertDraft,
  getDraftsForUser,
  deleteDraft,
  deleteDraftByKey,
  getDraftForChannel,
} from "./draft-service";

const draftSchema = z.object({
  id: z.string(),
  channelId: z.string(),
  userId: z.string(),
  content: z.string(),
  parentMessageId: z.string().nullable(),
  updatedAt: z.string(),
  createdAt: z.string(),
});

const draftWithChannelSchema = draftSchema.extend({
  channelName: z.string(),
});

const listDraftsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Drafts"],
  summary: "List all user drafts",
  security: [{ Bearer: [] }],
  middleware: [rlRead] as const,
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ drafts: z.array(draftWithChannelSchema) }),
        },
      },
      description: "List of drafts",
    },
  },
});

const upsertDraftRoute = createRoute({
  method: "put",
  path: "/",
  tags: ["Drafts"],
  summary: "Upsert a draft",
  security: [{ Bearer: [] }],
  middleware: [rlMessageSend] as const,
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            channelId: z.string().uuid(),
            content: z.string().max(10000),
            parentMessageId: z.string().uuid().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: draftSchema } },
      description: "Draft upserted",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Validation error",
    },
  },
});

const deleteDraftByIdRoute = createRoute({
  method: "delete",
  path: "/:id",
  tags: ["Drafts"],
  summary: "Delete draft by ID",
  security: [{ Bearer: [] }],
  middleware: [rlMessageSend] as const,
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: okSchema } },
      description: "Deleted",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Not found",
    },
  },
});

const deleteDraftByKeyRoute = createRoute({
  method: "delete",
  path: "/by-key",
  tags: ["Drafts"],
  summary: "Delete draft by channel/thread key",
  security: [{ Bearer: [] }],
  middleware: [rlMessageSend] as const,
  request: {
    query: z.object({
      channelId: z.string().uuid(),
      parentMessageId: z.string().uuid().optional(),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: okSchema } },
      description: "Deleted",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Not found",
    },
  },
});

const getDraftForChannelRoute = createRoute({
  method: "get",
  path: "/channel/:channelId",
  tags: ["Drafts"],
  summary: "Get draft for a channel or thread",
  security: [{ Bearer: [] }],
  middleware: [rlRead] as const,
  request: {
    params: z.object({ channelId: z.string().uuid() }),
    query: z.object({
      parentMessageId: z.string().uuid().optional(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ draft: draftSchema.nullable() }),
        },
      },
      description: "Draft for channel/thread",
    },
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(listDraftsRoute, async (c) => {
    const user = c.get("user");
    const workspace = c.get("workspace");
    const items = await getDraftsForUser(user.id, workspace.id);
    return jsonResponse(c, { drafts: items }, 200);
  })
  .openapi(upsertDraftRoute, async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json");
    const draft = await upsertDraft(
      user.id,
      body.channelId,
      body.content,
      body.parentMessageId,
    );
    return jsonResponse(c, draft, 200);
  })
  .openapi(deleteDraftByKeyRoute, async (c) => {
    const user = c.get("user");
    const { channelId, parentMessageId } = c.req.valid("query");
    const deleted = await deleteDraftByKey(user.id, channelId, parentMessageId);
    if (!deleted) {
      return c.json({ error: "Draft not found" }, 404);
    }
    return jsonResponse(c, { ok: true as const }, 200);
  })
  .openapi(deleteDraftByIdRoute, async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const deleted = await deleteDraft(id, user.id);
    if (!deleted) {
      return c.json({ error: "Draft not found" }, 404);
    }
    return jsonResponse(c, { ok: true as const }, 200);
  })
  .openapi(getDraftForChannelRoute, async (c) => {
    const user = c.get("user");
    const { channelId } = c.req.valid("param");
    const { parentMessageId } = c.req.valid("query");
    const draft = await getDraftForChannel(user.id, channelId, parentMessageId);
    return jsonResponse(c, { draft }, 200);
  });

export default app;
