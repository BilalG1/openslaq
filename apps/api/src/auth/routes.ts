import { Hono } from "hono";

const authRoutes = new Hono();

authRoutes.get("/mobile-oauth-callback", (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const error = c.req.query("error");
  const errorDescription = c.req.query("error_description");

  if (!code && !error) {
    return c.json({ error: "Missing code or error parameter" }, 400);
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
