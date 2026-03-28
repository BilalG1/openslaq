import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { auth } from "../auth/middleware";
import { BEARER_SECURITY, jsonContent } from "../lib/openapi-helpers";
import { canAccessAttachment, getAttachmentById, getDownloadUrl } from "./service";
import { rlRead } from "../rate-limit";
import { errorSchema } from "../openapi/schemas";
import { redirectResponse } from "../openapi/responses";
import { NotFoundError } from "../errors";

const downloadRoute = createRoute({
  method: "get",
  path: "/uploads/:id/download",
  tags: ["Uploads"],
  summary: "Download file",
  description: "Redirects to a pre-signed download URL for the attachment.",
  security: BEARER_SECURITY,
  middleware: [auth, rlRead] as const,
  request: {
    params: z.object({ id: z.string().describe("Attachment ID") }),
  },
  responses: {
    302: { description: "Redirect to download URL" },
    401: jsonContent(errorSchema, "Unauthorized"),
    404: jsonContent(errorSchema, "Attachment not found"),
  },
});

const app = new OpenAPIHono().openapi(downloadRoute, async (c) => {
  const user = c.get("user");
  const { id } = c.req.valid("param");
  const attachment = await getAttachmentById(id);

  if (!attachment) {
    throw new NotFoundError("Attachment");
  }

  const canAccess = await canAccessAttachment(attachment, user.id);
  if (!canAccess) {
    throw new NotFoundError("Attachment");
  }

  const url = getDownloadUrl(attachment.storageKey);
  return redirectResponse(c, url, 302);
});

export default app;
