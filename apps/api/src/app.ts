import { OpenAPIHono } from "@hono/zod-openapi";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { cors } from "hono/cors";
import { apiReference } from "@scalar/hono-api-reference";
import { env } from "./env";
import { Sentry } from "./sentry";
import { artificialDelay } from "./middleware/artificial-delay";
import workspaceRoutes from "./workspaces/routes";
import workspaceScopedRoutes from "./workspaces/scoped-routes";
import inviteAcceptRoutes from "./workspaces/invite-accept-routes";
import messageRoutes from "./messages/routes";
import userRoutes from "./users/routes";
import uploadDownloadRoutes from "./uploads/download-routes";
import uploadRoutes from "./uploads/routes";
import reactionRoutes from "./reactions/routes";
import adminRoutes from "./admin/routes";
import huddleRoutes from "./huddle/routes";
import rateLimitTestRoutes from "./rate-limit/test-routes";
import interactionRoutes from "./bots/interaction-routes";
import authRoutes from "./auth/routes";
import pushRoutes from "./push/routes";
import marketplaceRoutes from "./marketplace/routes";
import marketplaceTokenRoutes from "./marketplace/token-routes";
import apiKeyRoutes from "./api-keys/routes";
import serverInfoRoutes from "./server-info/routes";
import builtinAuthRoutes from "./auth/builtin-routes";
import { INTEGRATION_PLUGINS } from "./integrations/registry";
import { AppError } from "./errors";

const app = new OpenAPIHono();

app.onError((err, c) => {
  const shouldCapture = err instanceof AppError ? err.status >= 500 : true;
  if (shouldCapture) {
    Sentry.withScope((scope) => {
      const user = c.get("user" as never) as { id: string } | undefined;
      const workspace = c.get("workspace" as never) as { id: string } | undefined;
      if (user?.id) scope.setUser({ id: user.id });
      if (workspace?.id) scope.setTag("workspaceId", workspace.id);
      Sentry.captureException(err);
    });
  }
  if (err instanceof AppError) {
    return c.json({ error: err.message }, err.status as ContentfulStatusCode);
  }
  return c.json({ error: "Internal Server Error" }, 500);
});

app.get("/health", (c) => c.json({ status: "ok" }));
app.post("/health", (c) => c.json({ status: "ok" }));


app.use("/api/*", artificialDelay);

// OpenAPI spec setup (must be done before chaining .route() which narrows the type)
app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: "Stack Auth JWT token",
});

app.doc31("/api/openapi.json", {
  openapi: "3.1.0",
  info: {
    title: "OpenSlaq API",
    version: "1.0.0",
    description: "Real-time messaging platform API",
  },
  tags: [
    { name: "Users", description: "User profile management" },
    { name: "Workspaces", description: "Workspace CRUD operations" },
    { name: "Channels", description: "Channel management" },
    { name: "Messages", description: "Message CRUD and threading" },
    { name: "Reactions", description: "Emoji reactions" },
    { name: "Uploads", description: "File uploads and downloads" },
    { name: "DMs", description: "Direct messages" },
    { name: "Invites", description: "Workspace invitations" },
    { name: "Search", description: "Full-text message search" },
    { name: "Presence", description: "User online presence" },
    { name: "Bots", description: "Bot app management and API" },
    { name: "Marketplace", description: "Bot marketplace catalog and installation" },
    { name: "API Keys", description: "User API key management" },
  ],
});

app.get("/api/docs", apiReference({ url: "/api/openapi.json", theme: "kepler" }));

// Route mounting (chained for AppType inference)
const routes = app
  .use(
    cors({
      origin: (origin) => {
        if (!origin) return origin;
        return env.CORS_ORIGIN.includes(origin) ? origin : null;
      },
      credentials: true,
    }),
  )
  .route("/api/test", env.E2E_TEST_SECRET && process.env.NODE_ENV !== "production" ? rateLimitTestRoutes : new Hono())
  .route("/api", uploadDownloadRoutes)
  .route("/api/workspaces", workspaceRoutes)
  .route("/api/workspaces/:slug", workspaceScopedRoutes)
  .route("/api/invites", inviteAcceptRoutes)
  .route("/api", messageRoutes)
  .route("/api", uploadRoutes)
  .route("/api", reactionRoutes)
  .route("/api/users", userRoutes)
  .route("/api/admin", adminRoutes)
  .route("/api", huddleRoutes)
  .route("/api/bot-interactions", interactionRoutes)
  .route("/api/auth", authRoutes)
  .route("/api", pushRoutes)
  .route("/api/marketplace", marketplaceRoutes)
  .route("/api/marketplace/oauth", marketplaceTokenRoutes)
  .route("/api/api-keys", apiKeyRoutes)
  .route("/api", serverInfoRoutes)
  .route("/api/auth", env.AUTH_MODE === "builtin" ? builtinAuthRoutes : new Hono());

// Mount integration plugin webhook routes
for (const plugin of INTEGRATION_PLUGINS) {
  if (plugin.webhookRoutes) {
    routes.route(`/api/integrations/${plugin.slug}`, plugin.webhookRoutes);
  }
}

// Export the app type for Hono RPC client (end-to-end type safety)
export type AppType = typeof routes;

export default app;
