import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { AuthEnv } from "../auth/types";
import { auth } from "../auth/middleware";
import { BEARER_SECURITY, jsonContent } from "../lib/openapi-helpers";
import { rlRead } from "../rate-limit";
import { jsonResponse } from "../openapi/responses";
import { errorSchema } from "../openapi/schemas";
import { listListings, getListingBySlug } from "./service";
import { NotFoundError } from "../errors";

const BOT_SCOPES = [
  "chat:write",
  "chat:read",
  "channels:read",
  "channels:join",
  "channels:write",
  "reactions:write",
  "reactions:read",
  "users:read",
  "presence:read",
  "channels:members:read",
  "channels:members:write",
  "commands:write",
] as const;

const BOT_EVENT_TYPES = [
  "message:new",
  "message:updated",
  "message:deleted",
  "reaction:updated",
  "channel:updated",
  "channel:member-added",
  "channel:member-removed",
  "message:pinned",
  "message:unpinned",
  "presence:updated",
  "interaction",
  "slash_command",
] as const;

const listingSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  longDescription: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  category: z.string().nullable(),
  requestedScopes: z.array(z.enum(BOT_SCOPES)),
  requestedEvents: z.array(z.enum(BOT_EVENT_TYPES)),
  published: z.boolean(),
}).openapi("MarketplaceListing");

const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Marketplace"],
  summary: "List marketplace listings",
  description: "Returns all published marketplace bot listings.",
  security: BEARER_SECURITY,
  middleware: [rlRead] as const,
  responses: {
    200: jsonContent(z.array(listingSchema), "List of marketplace listings"),
  },
});

const getBySlugRoute = createRoute({
  method: "get",
  path: "/:slug",
  tags: ["Marketplace"],
  summary: "Get marketplace listing",
  description: "Returns a single marketplace listing by slug.",
  security: BEARER_SECURITY,
  middleware: [rlRead] as const,
  request: {
    params: z.object({ slug: z.string() }),
  },
  responses: {
    200: jsonContent(listingSchema, "Listing details"),
    404: jsonContent(errorSchema, "Listing not found"),
  },
});

const app = new OpenAPIHono<AuthEnv>();
app.use(auth);

const routes = app
  .openapi(listRoute, async (c) => {
    const listings = await listListings();
    return jsonResponse(c, listings, 200);
  })
  .openapi(getBySlugRoute, async (c) => {
    const slug = c.req.valid("param").slug;
    const listing = await getListingBySlug(slug);
    if (!listing) throw new NotFoundError("Listing");
    return jsonResponse(c, listing, 200);
  });

export default routes;
