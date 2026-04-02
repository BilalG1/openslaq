import { Hono } from "hono";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../env";
import { ServiceUnavailableError, UnauthorizedError } from "../../errors";
import { getSubscriptionsForProject, getVercelBotForWorkspace } from "./service";
import { handleVercelEvent } from "./event-handlers";
import { createMessage } from "../../messages/service";
import { setMessageActions } from "../../bots/service";
import { emitToChannel } from "../../lib/emit";
import { asChannelId, asUserId } from "@openslaq/shared";
import { captureException } from "../../sentry";

const app = new Hono();

// OAuth callback — Vercel redirects here after integration install.
// Exchanges the code for an access token and redirects the user to the web app.
app.get("/oauth/callback", async (c) => {
  const code = c.req.query("code");
  const configurationId = c.req.query("configurationId") ?? "";
  const teamId = c.req.query("teamId") ?? "";
  if (!code || !env.VERCEL_CLIENT_ID || !env.VERCEL_CLIENT_SECRET) {
    return c.text("Missing code or Vercel integration not configured", 400);
  }

  // Derive origin from forwarded headers (tunnel) or request URL
  const proto = c.req.header("x-forwarded-proto") ?? "http";
  const host = c.req.header("x-forwarded-host") ?? c.req.header("host") ?? "localhost:3001";
  const origin = `${proto}://${host}`;
  const redirectUri = `${origin}/api/integrations/vercel-bot/oauth/callback`;

  // Exchange code for access token (Vercel uses x-www-form-urlencoded)
  const tokenRes = await fetch("https://api.vercel.com/v2/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.VERCEL_CLIENT_ID,
      client_secret: env.VERCEL_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("[vercel] OAuth token exchange failed:", err);
    return c.text("Failed to exchange authorization code", 400);
  }

  const tokenData = (await tokenRes.json()) as {
    access_token: string;
    team_id?: string;
  };

  // Resolve team slug from Vercel API
  let teamSlug = "";
  const resolvedTeamId = teamId || tokenData.team_id || "";
  if (resolvedTeamId) {
    try {
      const teamRes = await fetch(`https://api.vercel.com/v2/teams/${resolvedTeamId}`, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (teamRes.ok) {
        const team = (await teamRes.json()) as { slug?: string };
        teamSlug = team.slug ?? "";
      }
    } catch {
      // Non-critical — slug is optional
    }
  }

  // Redirect to web app with connection details as query params
  // The web app settings page will POST to the workspace-scoped /connect endpoint
  const params = new URLSearchParams({
    vercel_connected: "1",
    access_token: tokenData.access_token,
    configuration_id: configurationId,
    team_id: resolvedTeamId,
    team_slug: teamSlug,
  });

  return c.redirect(`${origin}/?${params.toString()}`);
});

app.post("/webhook", async (c) => {
  const body = await c.req.text();
  // Vercel integration webhooks are signed with the client secret
  const secret = env.VERCEL_WEBHOOK_SECRET ?? env.VERCEL_CLIENT_SECRET;
  if (!secret) {
    throw new ServiceUnavailableError("Vercel webhook signature verification is not configured");
  }

  const signature = c.req.header("x-vercel-signature");
  if (!signature) {
    throw new UnauthorizedError("Missing signature");
  }

  // Vercel sends HMAC-SHA1 hex digest using the client secret
  const expected = createHmac("sha1", secret).update(body).digest("hex");
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    throw new UnauthorizedError("Invalid signature");
  }

  const payload = JSON.parse(body) as Record<string, unknown>;

  // Process in background
  processWebhook(payload).catch((err) => {
    captureException(err, { op: "vercel:webhook" });
  });

  return c.json({ ok: true });
});

async function processWebhook(
  payload: Record<string, unknown>,
): Promise<void> {
  const type = payload.type as string | undefined;
  if (!type) return;

  const inner = payload.payload as Record<string, unknown> | undefined;
  if (!inner) return;

  // Extract project ID from the payload
  let projectId: string | undefined;

  // Most events: payload.payload.project.id
  const project = inner.project as Record<string, unknown> | undefined;
  if (project?.id) {
    projectId = project.id as string;
  }

  // Fallback: payload.payload.projectId
  if (!projectId) {
    projectId = inner.projectId as string | undefined;
  }

  // Fallback: payload.payload.deployment.projectId
  if (!projectId) {
    const deployment = inner.deployment as Record<string, unknown> | undefined;
    if (deployment?.projectId) {
      projectId = deployment.projectId as string;
    }
  }

  // Project events: payload.payload.id (the project itself)
  if (!projectId && type.startsWith("project.")) {
    projectId = inner.id as string | undefined;
  }


  if (!projectId) return;

  const subscriptions = await getSubscriptionsForProject(projectId);
  if (subscriptions.length === 0) return;

  for (const sub of subscriptions) {
    const formatted = handleVercelEvent(type, payload, sub.enabledEvents);
    if (!formatted) continue;

    const bot = await getVercelBotForWorkspace(sub.workspaceId);
    if (!bot) continue;

    const result = await createMessage(
      asChannelId(sub.channelId),
      asUserId(bot.userId),
      formatted.content,
    );

    if ("error" in result) {
      console.error(`[vercel] Failed to create message in channel ${sub.channelId}:`, result.error);
      continue;
    }

    if (formatted.actions.length > 0) {
      await setMessageActions(result.id, bot.botAppId, formatted.actions.map((a) => ({
        id: crypto.randomUUID(),
        type: "button" as const,
        label: a.label,
        value: a.url,
        style: a.style ?? "default",
      })));
    }

    try {
      emitToChannel(asChannelId(sub.channelId), "message:new", result);
    } catch {
      // Socket.IO may not be initialized
    }
  }
}

export default app;
