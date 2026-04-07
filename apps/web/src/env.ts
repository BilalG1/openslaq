function required(key: string): string {
  const value = import.meta.env[key] as string | undefined;
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optional(key: string): string | undefined {
  return import.meta.env[key] as string | undefined;
}

export const env = {
  VITE_API_URL: required("VITE_API_URL"),
  VITE_STACK_PROJECT_ID: required("VITE_STACK_PROJECT_ID"),
  VITE_STACK_PUBLISHABLE_CLIENT_KEY: required(
    "VITE_STACK_PUBLISHABLE_CLIENT_KEY",
  ),
  VITE_WEB_URL: optional("VITE_WEB_URL"),
  VITE_LIVEKIT_WS_URL: optional("VITE_LIVEKIT_WS_URL"),
  VITE_E2E_TEST_SECRET: optional("VITE_E2E_TEST_SECRET"),
} as const;
