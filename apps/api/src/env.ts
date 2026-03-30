import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string(),
  AUTH_MODE: z.enum(["stack-auth", "builtin"]).default("stack-auth"),
  AUTH_JWT_SECRET: z.string().optional(),
  SERVER_NAME: z.string().default("OpenSlaq"),
  VITE_STACK_PROJECT_ID: z.string().optional(),
  VITE_STACK_PUBLISHABLE_CLIENT_KEY: z.string().optional(),
  PORT: z.coerce.number().optional(),
  API_PORT: z.coerce.number().default(3001),
  API_ARTIFICIAL_DELAY_MS: z.coerce.number().int().nonnegative().default(0),
  CORS_ORIGIN: z.string().default("http://localhost:3000")
    .transform((s) => s.split(",").map((o) => o.trim())),
  E2E_TEST_SECRET: z.string().optional(),
  ADMIN_USER_IDS: z.string().default(""),
  STACK_SECRET_SERVER_KEY: z.string().optional(),
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
  LIVEKIT_API_URL: z.string().default("http://localhost:3004"),
  LIVEKIT_WS_URL: z.string().default("ws://localhost:3004"),
  LIVEKIT_PUBLIC_WS_URL: z.string().optional(),
  APNS_KEY_ID: z.string().optional(),
  APNS_TEAM_ID: z.string().optional(),
  APNS_KEY_PATH: z.string().optional(),
  APNS_KEY_BASE64: z.string().optional(),
  APNS_BUNDLE_ID: z.string().default("com.openslaq.mobile"),
  APNS_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  GITHUB_APP_CLIENT_ID: z.string().optional(),
  GITHUB_APP_CLIENT_SECRET: z.string().optional(),
  LINEAR_CLIENT_ID: z.string().optional(),
  LINEAR_CLIENT_SECRET: z.string().optional(),
  LINEAR_WEBHOOK_SECRET: z.string().optional(),
  SENTRY_CLIENT_ID: z.string().optional(),
  SENTRY_CLIENT_SECRET: z.string().optional(),
  SENTRY_WEBHOOK_SECRET: z.string().optional(),
  SENTRY_APP_SLUG: z.string().optional(),
  VERCEL_CLIENT_ID: z.string().optional(),
  VERCEL_CLIENT_SECRET: z.string().optional(),
  VERCEL_WEBHOOK_SECRET: z.string().optional(),
});

const parsed = envSchema.parse(process.env);

const isProduction = parsed.NODE_ENV === "production";

if (isProduction && (!parsed.LIVEKIT_API_KEY || !parsed.LIVEKIT_API_SECRET)) {
  throw new Error("LIVEKIT_API_KEY and LIVEKIT_API_SECRET are required in production");
}

if (parsed.AUTH_MODE === "stack-auth" && !parsed.VITE_STACK_PROJECT_ID) {
  throw new Error("VITE_STACK_PROJECT_ID is required when AUTH_MODE=stack-auth");
}

if (parsed.AUTH_MODE === "builtin" && !parsed.AUTH_JWT_SECRET) {
  throw new Error("AUTH_JWT_SECRET is required when AUTH_MODE=builtin");
}

export const env = {
  ...parsed,
  LIVEKIT_API_KEY: parsed.LIVEKIT_API_KEY ?? "devkey",
  LIVEKIT_API_SECRET: parsed.LIVEKIT_API_SECRET ?? "devsecret",
};
