import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import {
  listCustomEmojis,
  createCustomEmoji,
  deleteCustomEmoji,
  getCustomEmojiByName,
  isValidEmojiName,
  isImageMimeType,
  MAX_EMOJI_SIZE,
} from "./service";
import { getIO } from "../socket/io";
import { errorSchema } from "../openapi/schemas";
import type { CustomEmoji } from "@openslaq/shared";
import { asEmojiId } from "@openslaq/shared";

const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Custom Emoji"],
  summary: "List custom emoji",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            emojis: z.array(z.object({
              id: z.string(),
              workspaceId: z.string(),
              name: z.string(),
              url: z.string(),
              uploadedBy: z.string(),
              createdAt: z.string(),
            })),
          }),
        },
      },
      description: "Custom emoji list",
    },
  },
});

const uploadRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Custom Emoji"],
  summary: "Upload custom emoji",
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            file: z.any().describe("Emoji image file"),
            name: z.string().describe("Emoji name"),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: z.object({
            emoji: z.object({
              id: z.string(),
              workspaceId: z.string(),
              name: z.string(),
              url: z.string(),
              uploadedBy: z.string(),
              createdAt: z.string(),
            }),
          }),
        },
      },
      description: "Created emoji",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Validation error",
    },
    409: {
      content: { "application/json": { schema: errorSchema } },
      description: "Emoji name already exists",
    },
  },
});

const deleteRoute = createRoute({
  method: "delete",
  path: "/:emojiId",
  tags: ["Custom Emoji"],
  summary: "Delete custom emoji",
  request: {
    params: z.object({ emojiId: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ ok: z.literal(true) }) } },
      description: "Emoji deleted",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Emoji not found",
    },
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(listRoute, async (c) => {
    const workspace = c.get("workspace");
    const emojis = await listCustomEmojis(workspace.id);
    return c.json({ emojis }, 200);
  })
  .openapi(uploadRoute, async (c) => {
    const workspace = c.get("workspace");
    const user = c.get("user");
    const body = await c.req.parseBody();

    const name = body["name"];
    const file = body["file"];

    if (typeof name !== "string" || !name) {
      return c.json({ error: "Name is required" }, 400);
    }

    if (!isValidEmojiName(name)) {
      return c.json({ error: "Invalid emoji name. Use 2-32 lowercase alphanumeric characters, hyphens, or underscores." }, 400);
    }

    if (!(file instanceof File)) {
      return c.json({ error: "File is required" }, 400);
    }

    if (!isImageMimeType(file.type)) {
      return c.json({ error: "Only image files are allowed" }, 400);
    }

    if (file.size > MAX_EMOJI_SIZE) {
      return c.json({ error: "File size must be under 512KB" }, 400);
    }

    // Check for duplicate name
    const existing = await getCustomEmojiByName(workspace.id, name);
    if (existing) {
      return c.json({ error: `Emoji :${name}: already exists` }, 409);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const emoji = await createCustomEmoji(workspace.id, name, { bytes, type: file.type }, user.id);

    const io = getIO();
    io.to(`workspace:${workspace.id}`).emit("emoji:added", { emoji: emoji as CustomEmoji });

    return c.json({ emoji }, 201);
  })
  .openapi(deleteRoute, async (c) => {
    const workspace = c.get("workspace");
    const { emojiId } = c.req.valid("param");

    const deleted = await deleteCustomEmoji(workspace.id, emojiId);
    if (!deleted) {
      return c.json({ error: "Emoji not found" }, 404);
    }

    const io = getIO();
    io.to(`workspace:${workspace.id}`).emit("emoji:deleted", { emojiId: asEmojiId(emojiId) });

    return c.json({ ok: true as const }, 200);
  });

export default app;
