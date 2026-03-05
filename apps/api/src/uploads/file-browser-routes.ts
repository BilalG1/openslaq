import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { browseFiles } from "./file-browser-service";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { rlRead } from "../rate-limit/tiers";
import { jsonResponse } from "../openapi/responses";
import type { FileCategory } from "@openslaq/shared";

const fileBrowserItemSchema = z.object({
  id: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  size: z.number(),
  category: z.enum(["images", "videos", "documents", "audio", "other"]),
  downloadUrl: z.string(),
  uploadedBy: z.string().nullable(),
  uploaderName: z.string(),
  channelId: z.string(),
  channelName: z.string(),
  messageId: z.string(),
  createdAt: z.string(),
});

const listFilesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Files"],
  summary: "Browse workspace files",
  description: "Returns files shared in workspace messages, with optional filtering by channel and category.",
  security: [{ Bearer: [] }],
  middleware: [rlRead] as const,
  request: {
    query: z.object({
      channelId: z.string().optional(),
      category: z.enum(["images", "videos", "documents", "audio", "other"]).optional(),
      cursor: z.string().optional(),
      limit: z.coerce.number().min(1).max(100).optional(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            files: z.array(fileBrowserItemSchema),
            nextCursor: z.string().nullable(),
          }),
        },
      },
      description: "Paginated file listing",
    },
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(listFilesRoute, async (c) => {
    const user = c.get("user");
    const workspace = c.get("workspace");
    const { channelId, category, cursor, limit } = c.req.valid("query");

    const result = await browseFiles({
      workspaceId: workspace.id,
      userId: user.id,
      channelId,
      category: category as FileCategory | undefined,
      cursor,
      limit,
    });

    return jsonResponse(c, result, 200);
  });

export default app;
