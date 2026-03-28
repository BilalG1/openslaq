import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { auth } from "../auth/middleware";
import { BEARER_SECURITY, jsonContent } from "../lib/openapi-helpers";
import { createAttachment, getUserStorageUsage, MAX_STORAGE_PER_USER_BYTES } from "./service";
import { getPresignedDownloadUrl } from "./s3";
import { MAX_FILE_SIZE, MAX_FILES_PER_REQUEST, isAllowedMimeType } from "./validation";
import { rlFileUpload } from "../rate-limit";
import { uploadResponseSchema, errorSchema } from "../openapi/schemas";
import { jsonResponse } from "../openapi/responses";
import { BadRequestError } from "../errors";

const uploadRoute = createRoute({
  method: "post",
  path: "/uploads",
  tags: ["Uploads"],
  summary: "Upload files",
  description: "Uploads one or more files. Max 50MB per file, max 10 files per request.",
  security: BEARER_SECURITY,
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
    201: jsonContent(uploadResponseSchema, "Uploaded attachments"),
    400: jsonContent(errorSchema, "Validation error"),
  },
});

const app = new OpenAPIHono().openapi(uploadRoute, async (c) => {
  const user = c.get("user");
  const body = await c.req.parseBody({ all: true });

  const rawFiles = body["files"];
  if (!rawFiles) {
    throw new BadRequestError("No files provided");
  }

  const files = Array.isArray(rawFiles) ? rawFiles : [rawFiles];

  // Filter to only File objects
  const fileObjects = files.filter((f): f is File => f instanceof File);
  if (fileObjects.length === 0) {
    throw new BadRequestError("No files provided");
  }

  if (fileObjects.length > MAX_FILES_PER_REQUEST) {
    throw new BadRequestError(`Maximum ${MAX_FILES_PER_REQUEST} files per request`);
  }

  // Check per-user storage quota
  const totalUploadSize = fileObjects.reduce((sum, f) => sum + f.size, 0);
  const currentUsage = await getUserStorageUsage(user.id);
  if (currentUsage + totalUploadSize > MAX_STORAGE_PER_USER_BYTES) {
    throw new BadRequestError("Storage quota exceeded (1 GB limit)");
  }

  // Validate all files first
  for (const file of fileObjects) {
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestError(`File "${file.name}" exceeds maximum size of 50MB`);
    }
    if (!isAllowedMimeType(file.type)) {
      throw new BadRequestError(`File type "${file.type}" is not allowed`);
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
