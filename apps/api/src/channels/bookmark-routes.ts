import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { resolveChannel, requireChannelMember } from "./middleware";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { rlRead, rlMemberManage } from "../rate-limit";
import { asChannelId, asUserId, asBookmarkId, zChannelId } from "@openslaq/shared";
import type { ChannelBookmark } from "@openslaq/shared";
import { addBookmark, removeBookmark, getBookmarks } from "./bookmark-service";
import { emitToChannel } from "../lib/emit";
import { okSchema, errorSchema } from "../openapi/schemas";
import { BadRequestError, NotFoundError } from "../errors";
import { BEARER_SECURITY, jsonBody, jsonContent } from "../lib/openapi-helpers";
import { getChannelContext } from "../lib/context";

const channelIdParam = z.object({ id: zChannelId() });

const bookmarkSchema = z.object({
  id: z.string(),
  channelId: z.string(),
  url: z.string(),
  title: z.string(),
  createdBy: z.string(),
  createdAt: z.string(),
});

const listBookmarksRoute = createRoute({
  method: "get",
  path: "/:id/bookmarks",
  tags: ["Channel Bookmarks"],
  summary: "List channel bookmarks",
  security: BEARER_SECURITY,
  middleware: [rlRead, resolveChannel, requireChannelMember] as const,
  request: { params: channelIdParam },
  responses: {
    200: jsonContent(z.object({ bookmarks: z.array(bookmarkSchema) }), "List of bookmarks"),
  },
});

const addBookmarkRoute = createRoute({
  method: "post",
  path: "/:id/bookmarks",
  tags: ["Channel Bookmarks"],
  summary: "Add channel bookmark",
  security: BEARER_SECURITY,
  middleware: [rlMemberManage, resolveChannel, requireChannelMember] as const,
  request: {
    params: channelIdParam,
    body: jsonBody(z.object({
      url: z.string().url().max(2000),
      title: z.string().min(1).max(200),
    })),
  },
  responses: {
    201: jsonContent(bookmarkSchema, "Created bookmark"),
    400: jsonContent(errorSchema, "Validation error or channel is archived"),
  },
});

const removeBookmarkRoute = createRoute({
  method: "delete",
  path: "/:id/bookmarks/:bookmarkId",
  tags: ["Channel Bookmarks"],
  summary: "Remove channel bookmark",
  security: BEARER_SECURITY,
  middleware: [rlMemberManage, resolveChannel, requireChannelMember] as const,
  request: {
    params: z.object({
      id: zChannelId(),
      bookmarkId: z.string().describe("Bookmark ID"),
    }),
  },
  responses: {
    200: jsonContent(okSchema, "Bookmark removed"),
    404: jsonContent(errorSchema, "Bookmark not found"),
  },
});

function toBookmarkResponse(row: {
  id: string;
  channelId: string;
  url: string;
  title: string;
  createdBy: string;
  createdAt: Date;
}): ChannelBookmark {
  return {
    id: asBookmarkId(row.id),
    channelId: asChannelId(row.channelId),
    url: row.url,
    title: row.title,
    createdBy: asUserId(row.createdBy),
    createdAt: row.createdAt.toISOString(),
  };
}

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(listBookmarksRoute, async (c) => {
    const { channel } = getChannelContext(c);
    const rows = await getBookmarks(channel.id);
    const bookmarks = rows.map(toBookmarkResponse);
    return c.json({ bookmarks }, 200);
  })
  .openapi(addBookmarkRoute, async (c) => {
    const { channel, user } = getChannelContext(c);

    if (channel.isArchived) {
      throw new BadRequestError("Channel is archived");
    }

    const { url, title } = c.req.valid("json");
    const row = await addBookmark(channel.id, url, title, user.id);
    const bookmark = toBookmarkResponse(row);

    emitToChannel(channel.id, "bookmark:added", { bookmark });

    return c.json(bookmark, 201);
  })
  .openapi(removeBookmarkRoute, async (c) => {
    const { channel } = getChannelContext(c);
    const { bookmarkId } = c.req.valid("param");

    const removed = await removeBookmark(channel.id, bookmarkId);
    if (!removed) {
      throw new NotFoundError("Bookmark");
    }

    emitToChannel(channel.id, "bookmark:removed", {
      channelId: channel.id,
      bookmarkId: asBookmarkId(bookmarkId),
    });

    return c.json({ ok: true as const }, 200);
  });

export default app;
