import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { env } from "../env";
import { getStackServerApp } from "../admin/stack-server";
import { AppError, UnauthorizedError } from "../errors";

const demoSignInSchema = z.object({
  email: z.string().email(),
  code: z.string(),
});

const demoAuthRoutes = new Hono();

demoAuthRoutes.post("/demo-sign-in", zValidator("json", demoSignInSchema), async (c) => {
  if (!env.DEMO_EMAIL || !env.DEMO_OTP_CODE) {
    throw new AppError(404, "Not found");
  }

  const { email, code } = c.req.valid("json");

  if (email.toLowerCase() !== env.DEMO_EMAIL.toLowerCase() || code !== env.DEMO_OTP_CODE) {
    throw new UnauthorizedError("Invalid email or code");
  }

  const stackServer = getStackServerApp();

  // Find existing user by email or create a new one
  const existing = await stackServer.listUsers({ query: email, limit: 1 });
  const user = existing.find((u) => u.primaryEmail?.toLowerCase() === email.toLowerCase())
    ?? await stackServer.createUser({
      primaryEmail: email,
      displayName: "App Reviewer",
      primaryEmailVerified: true,
      primaryEmailAuthEnabled: true,
    });

  const session = await user.createSession({});
  const tokens = await session.getTokens();

  if (!tokens.accessToken || !tokens.refreshToken) {
    throw new AppError(500, "Failed to create demo session");
  }

  return c.json({
    userId: user.id,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
});

export default demoAuthRoutes;
