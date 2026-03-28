import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { rlRead, rlMessageSend } from "../rate-limit";
import { jsonResponse } from "../openapi/responses";
import { BEARER_SECURITY, jsonBody, jsonContent } from "../lib/openapi-helpers";
import { errorSchema, okSchema } from "../openapi/schemas";
import {
  upsertDraft,
  getDraftsForUser,
  deleteDraft,
  deleteDraftByKey,
  getDraftForChannel,
} from "./draft-service";
import { NotFoundError } from "../errors";
import { getWorkspaceMemberContext } from "../lib/context";

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
  security: BEARER_SECURITY,
  middleware: [rlRead] as const,
  responses: {
    200: jsonContent(z.object({ drafts: z.array(draftWithChannelSchema) }), "List of drafts"),
  },
});

const upsertDraftRoute = createRoute({
  method: "put",
  path: "/",
  tags: ["Drafts"],
  summary: "Upsert a draft",
  security: BEARER_SECURITY,
  middleware: [rlMessageSend] as const,
  request: {
    body: jsonBody(z.object({
      channelId: z.string().uuid(),
      content: z.string().max(10000),
      parentMessageId: z.string().uuid().optional(),
    })),
  },
  responses: {
    200: jsonContent(draftSchema, "Draft upserted"),
    400: jsonContent(errorSchema, "Validation error"),
  },
});

const deleteDraftByIdRoute = createRoute({
  method: "delete",
  path: "/:id",
  tags: ["Drafts"],
  summary: "Delete draft by ID",
  security: BEARER_SECURITY,
  middleware: [rlMessageSend] as const,
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: jsonContent(okSchema, "Deleted"),
    404: jsonContent(errorSchema, "Not found"),
  },
});

const deleteDraftByKeyRoute = createRoute({
  method: "delete",
  path: "/by-key",
  tags: ["Drafts"],
  summary: "Delete draft by channel/thread key",
  security: BEARER_SECURITY,
  middleware: [rlMessageSend] as const,
  request: {
    query: z.object({
      channelId: z.string().uuid(),
      parentMessageId: z.string().uuid().optional(),
    }),
  },
  responses: {
    200: jsonContent(okSchema, "Deleted"),
    404: jsonContent(errorSchema, "Not found"),
  },
});

const getDraftForChannelRoute = createRoute({
  method: "get",
  path: "/channel/:channelId",
  tags: ["Drafts"],
  summary: "Get draft for a channel or thread",
  security: BEARER_SECURITY,
  middleware: [rlRead] as const,
  request: {
    params: z.object({ channelId: z.string().uuid() }),
    query: z.object({
      parentMessageId: z.string().uuid().optional(),
    }),
  },
  responses: {
    200: jsonContent(z.object({ draft: draftSchema.nullable() }), "Draft for channel/thread"),
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(listDraftsRoute, async (c) => {
    const { user, workspace } = getWorkspaceMemberContext(c);
    const items = await getDraftsForUser(user.id, workspace.id);
    return jsonResponse(c, { drafts: items }, 200);
  })
  .openapi(upsertDraftRoute, async (c) => {
    const { user } = getWorkspaceMemberContext(c);
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
    const { user } = getWorkspaceMemberContext(c);
    const { channelId, parentMessageId } = c.req.valid("query");
    const deleted = await deleteDraftByKey(user.id, channelId, parentMessageId);
    if (!deleted) {
      throw new NotFoundError("Draft");
    }
    return jsonResponse(c, { ok: true as const }, 200);
  })
  .openapi(deleteDraftByIdRoute, async (c) => {
    const { user } = getWorkspaceMemberContext(c);
    const { id } = c.req.valid("param");
    const deleted = await deleteDraft(id, user.id);
    if (!deleted) {
      throw new NotFoundError("Draft");
    }
    return jsonResponse(c, { ok: true as const }, 200);
  })
  .openapi(getDraftForChannelRoute, async (c) => {
    const { user } = getWorkspaceMemberContext(c);
    const { channelId } = c.req.valid("param");
    const { parentMessageId } = c.req.valid("query");
    const draft = await getDraftForChannel(user.id, channelId, parentMessageId);
    return jsonResponse(c, { draft }, 200);
  });

export default app;
