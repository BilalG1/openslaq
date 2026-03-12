import { z } from "zod";

const envSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().default("http://localhost:3001"),
  EXPO_PUBLIC_WEB_URL: z.string().default("http://localhost:3000"),
  EXPO_PUBLIC_STACK_PROJECT_ID: z.string().default(""),
  EXPO_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY: z.string().default(""),
});

export const env = envSchema.parse({
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_WEB_URL: process.env.EXPO_PUBLIC_WEB_URL,
  EXPO_PUBLIC_STACK_PROJECT_ID: process.env.EXPO_PUBLIC_STACK_PROJECT_ID,
  EXPO_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY: process.env.EXPO_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY,
});

if (!__DEV__ && !env.EXPO_PUBLIC_API_URL.startsWith("https://")) {
  console.warn(
    "[env] EXPO_PUBLIC_API_URL does not use HTTPS in production:",
    env.EXPO_PUBLIC_API_URL,
  );
}
