import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { auth } from "../auth/middleware";
import { createAttachment, getUserStorageUsage, MAX_STORAGE_PER_USER_BYTES } from "./service";
import { getPresignedDownloadUrl } from "./s3";
import { MAX_FILE_SIZE, MAX_FILES_PER_REQUEST, isAllowedMimeType } from "./validation";
import { rlFileUpload } from "../rate-limit";
import { uploadResponseSchema, errorSchema } from "../openapi/schemas";
import { jsonResponse } from "../openapi/responses";

const uploadRoute = createRoute({
  method: "post",
  path: "/uploads",
  tags: ["Uploads"],
  summary: "Upload files",
  description: "Uploads one or more files. Max 50MB per file, max 10 files per request.",
  security: [{ Bearer: [] }],
  middleware: [auth, rlFileUpload] as const,
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            files: z.any().describe("File(s) to upload"),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: uploadResponseSchema } },
      description: "Uploaded attachments",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Validation error",
    },
  },
});

const app = new OpenAPIHono().openapi(uploadRoute, async (c) => {
  const user = c.get("user");
  const body = await c.req.parseBody({ all: true });

  const rawFiles = body["files"];
  if (!rawFiles) {
    return c.json({ error: "No files provided" }, 400);
  }

  const files = Array.isArray(rawFiles) ? rawFiles : [rawFiles];

  // Filter to only File objects
  const fileObjects = files.filter((f): f is File => f instanceof File);
  if (fileObjects.length === 0) {
    return c.json({ error: "No files provided" }, 400);
  }

  if (fileObjects.length > MAX_FILES_PER_REQUEST) {
    return c.json({ error: `Maximum ${MAX_FILES_PER_REQUEST} files per request` }, 400);
  }

  // Check per-user storage quota
  const totalUploadSize = fileObjects.reduce((sum, f) => sum + f.size, 0);
  const currentUsage = await getUserStorageUsage(user.id);
  if (currentUsage + totalUploadSize > MAX_STORAGE_PER_USER_BYTES) {
    return c.json({ error: "Storage quota exceeded (1 GB limit)" }, 400);
  }

  // Validate all files first
  for (const file of fileObjects) {
    if (file.size > MAX_FILE_SIZE) {
      return c.json({ error: `File "${file.name}" exceeds maximum size of 50MB` }, 400);
    }
    if (!isAllowedMimeType(file.type)) {
      return c.json({ error: `File type "${file.type}" is not allowed` }, 400);
    }
  }

  const results = await Promise.all(
    fileObjects.map(async (file) => {
      const bytes = new Uint8Array(await file.arrayBuffer());
      return createAttachment({ name: file.name, type: file.type, bytes }, user.id);
    }),
  );

  return jsonResponse(c, {
    attachments: results.map((attachment) => ({
      id: attachment.id,
      messageId: attachment.messageId,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
      uploadedBy: attachment.uploadedBy,
      createdAt: attachment.createdAt.toISOString(),
      downloadUrl: getPresignedDownloadUrl(attachment.storageKey),
    })),
  }, 201);
});

export default app;
