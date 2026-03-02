import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string(),
  VITE_STACK_PROJECT_ID: z.string(),
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
  APNS_KEY_ID: z.string().optional(),
  APNS_TEAM_ID: z.string().optional(),
  APNS_KEY_PATH: z.string().optional(),
  APNS_BUNDLE_ID: z.string().default("com.openslaq.mobile"),
  APNS_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),
});

const parsed = envSchema.parse(process.env);

const isProduction = process.env.NODE_ENV === "production";

if (isProduction && (!parsed.LIVEKIT_API_KEY || !parsed.LIVEKIT_API_SECRET)) {
  throw new Error("LIVEKIT_API_KEY and LIVEKIT_API_SECRET are required in production");
}

export const env = {
  ...parsed,
  LIVEKIT_API_KEY: parsed.LIVEKIT_API_KEY ?? "devkey",
  LIVEKIT_API_SECRET: parsed.LIVEKIT_API_SECRET ?? "devsecret",
};
