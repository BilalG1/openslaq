import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import * as jose from "jose";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../users/schema";
import { builtinJwtSecret } from "./jwt";
import { ConflictError, UnauthorizedError, AppError } from "../errors";

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1),
});

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, { algorithm: "bcrypt", cost: 10 });
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash);
}

async function generateTokens(userId: string, email: string, displayName: string) {
  if (!builtinJwtSecret) throw new Error("AUTH_JWT_SECRET not configured");

  const accessToken = await new jose.SignJWT({
    email,
    name: displayName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(builtinJwtSecret);

  const refreshToken = await new jose.SignJWT({
    type: "refresh",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(builtinJwtSecret);

  return { accessToken, refreshToken, userId };
}

const builtinAuthRoutes = new Hono();

builtinAuthRoutes.post("/sign-up", zValidator("json", signUpSchema), async (c) => {
  const { email, password, displayName } = c.req.valid("json");

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) {
    throw new ConflictError("Email already registered");
  }

  const passwordHash = await hashPassword(password);
  const userId = crypto.randomUUID();

  await db.insert(users).values({
    id: userId,
    email,
    displayName,
    passwordHash,
  });

  const tokens = await generateTokens(userId, email, displayName);
  return c.json(tokens, 201);
});

builtinAuthRoutes.post("/sign-in", zValidator("json", signInSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (!user || !user.passwordHash) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const tokens = await generateTokens(user.id, user.email, user.displayName);
  return c.json(tokens);
});

builtinAuthRoutes.post("/refresh", zValidator("json", refreshSchema), async (c) => {
  const { refreshToken } = c.req.valid("json");

  if (!builtinJwtSecret) {
    throw new AppError(500, "Builtin auth not configured");
  }

  try {
    const { payload } = await jose.jwtVerify(refreshToken, builtinJwtSecret);
    if (payload.type !== "refresh" || !payload.sub) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.sub),
    });
    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    const tokens = await generateTokens(user.id, user.email, user.displayName);
    return c.json(tokens);
  } catch {
    throw new UnauthorizedError("Invalid refresh token");
  }
});

export default builtinAuthRoutes;
