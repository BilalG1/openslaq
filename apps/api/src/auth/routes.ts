import { Hono } from "hono";
import * as jose from "jose";
import { env } from "../env";
import { e2eTestSecret } from "./jwt";
import { AppError, UnauthorizedError, BadRequestError } from "../errors";

const authRoutes = new Hono();

// Dev-only endpoint: mint a self-signed JWT for quick sign-in (mobile, CLI, etc.)
authRoutes.post("/dev-sign-in", async (c) => {
  if (process.env.NODE_ENV === "production") {
    throw new AppError(404, "Not found");
  }

  const body = await c.req.json<{ secret: string }>();

  if (!e2eTestSecret || body.secret !== env.E2E_TEST_SECRET) {
    throw new UnauthorizedError();
  }

  const projectId = env.VITE_STACK_PROJECT_ID ?? "dev";
  const issuer = `https://api.stack-auth.com/api/v1/projects/${projectId}`;

  const n = Math.floor(Math.random() * 10000);
  const userId = crypto.randomUUID();
  const displayName = `Dev User ${n}`;
  const email = `dev-${n}@openslaq.local`;

  const accessToken = await new jose.SignJWT({
    email,
    name: displayName,
    email_verified: true,
    project_id: projectId,
    branch_id: "main",
    refresh_token_id: `dev-rt-${userId}`,
    role: "authenticated",
    selected_team_id: null,
    is_anonymous: false,
    is_restricted: false,
    restricted_reason: null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(issuer)
    .setAudience(projectId)
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(e2eTestSecret);

  return c.json({ userId, accessToken });
});

authRoutes.get("/mobile-oauth-callback", (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const error = c.req.query("error");
  const errorDescription = c.req.query("error_description");

  if (!code && !error) {
    throw new BadRequestError("Missing code or error parameter");
  }

  // Decode app redirect URI from state (base64-encoded JSON with nonce + redirect).
  // Falls back to the hardcoded scheme for older clients.
  let appRedirectBase = "openslaq://oauth-callback";
  if (state) {
    try {
      const parsed = JSON.parse(atob(state));
      if (typeof parsed.redirect === "string" && parsed.redirect) {
        try {
          const redirectUrl = new URL(parsed.redirect);
          if (redirectUrl.protocol === "openslaq:") {
            appRedirectBase = parsed.redirect;
          }
        } catch {
          // Invalid URL, use default
        }
      }
    } catch {
      // Not JSON — legacy plain-string state, use default scheme
    }
  }

  const params = new URLSearchParams();
  if (code) params.set("code", code);
  if (state) params.set("state", state);
  if (error) params.set("error", error);
  if (errorDescription) params.set("error_description", errorDescription);

  const separator = appRedirectBase.includes("?") ? "&" : "?";
  return c.redirect(`${appRedirectBase}${separator}${params.toString()}`, 302);
});

export default authRoutes;
