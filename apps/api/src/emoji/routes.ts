import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { jsonContent } from "../lib/openapi-helpers";
import {
  listCustomEmojis,
  createCustomEmoji,
  deleteCustomEmoji,
  getCustomEmojiByName,
  isValidEmojiName,
  isImageMimeType,
  MAX_EMOJI_SIZE,
} from "./service";
import { emitToWorkspace } from "../lib/emit";
import { errorSchema } from "../openapi/schemas";
import type { CustomEmoji } from "@openslaq/shared";
import { asEmojiId } from "@openslaq/shared";
import { BadRequestError, ConflictError, NotFoundError } from "../errors";
import { getWorkspaceMemberContext } from "../lib/context";

const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Custom Emoji"],
  summary: "List custom emoji",
  responses: {
    200: jsonContent(z.object({
      emojis: z.array(z.object({
        id: z.string(),
        workspaceId: z.string(),
        name: z.string(),
        url: z.string(),
        uploadedBy: z.string(),
        createdAt: z.string(),
      })),
    }), "Custom emoji list"),
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
    201: jsonContent(z.object({
      emoji: z.object({
        id: z.string(),
        workspaceId: z.string(),
        name: z.string(),
        url: z.string(),
        uploadedBy: z.string(),
        createdAt: z.string(),
      }),
    }), "Created emoji"),
    400: jsonContent(errorSchema, "Validation error"),
    409: jsonContent(errorSchema, "Emoji name already exists"),
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
    200: jsonContent(z.object({ ok: z.literal(true) }), "Emoji deleted"),
    404: jsonContent(errorSchema, "Emoji not found"),
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(listRoute, async (c) => {
    const workspace = c.get("workspace");
    const emojis = await listCustomEmojis(workspace.id);
    return c.json({ emojis }, 200);
  })
  .openapi(uploadRoute, async (c) => {
    const { user, workspace } = getWorkspaceMemberContext(c);
    const body = await c.req.parseBody();

    const name = body["name"];
    const file = body["file"];

    if (typeof name !== "string" || !name) {
      throw new BadRequestError("Name is required");
    }

    if (!isValidEmojiName(name)) {
      throw new BadRequestError("Invalid emoji name. Use 2-32 lowercase alphanumeric characters, hyphens, or underscores.");
    }

    if (!(file instanceof File)) {
      throw new BadRequestError("File is required");
    }

    if (!isImageMimeType(file.type)) {
      throw new BadRequestError("Only image files are allowed");
    }

    if (file.size > MAX_EMOJI_SIZE) {
      throw new BadRequestError("File size must be under 512KB");
    }

    // Check for duplicate name
    const existing = await getCustomEmojiByName(workspace.id, name);
    if (existing) {
      throw new ConflictError(`Emoji :${name}: already exists`);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const emoji = await createCustomEmoji(workspace.id, name, { bytes, type: file.type }, user.id);

    emitToWorkspace(workspace.id, "emoji:added", { emoji: emoji as CustomEmoji });

    return c.json({ emoji }, 201);
  })
  .openapi(deleteRoute, async (c) => {
    const workspace = c.get("workspace");
    const { emojiId } = c.req.valid("param");

    const deleted = await deleteCustomEmoji(workspace.id, emojiId);
    if (!deleted) {
      throw new NotFoundError("Emoji");
    }

    emitToWorkspace(workspace.id, "emoji:deleted", { emojiId: asEmojiId(emojiId) });

    return c.json({ ok: true as const }, 200);
  });

export default app;
