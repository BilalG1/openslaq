import { vi } from "vitest";

// Provide default env vars so that importOriginal() chains that transitively
// load env.ts don't blow up with "Missing required environment variable".
vi.mock("./env", () => ({
  env: {
    VITE_API_URL: "http://localhost:3001",
    VITE_STACK_PROJECT_ID: "00000000-0000-0000-0000-000000000000",
    VITE_STACK_PUBLISHABLE_CLIENT_KEY: "test-key",
    VITE_LIVEKIT_WS_URL: undefined,
    VITE_E2E_TEST_SECRET: undefined,
  },
}));

// Prevent @stripe/stripe-js from injecting a <script> tag (happy-dom blocks external scripts)
vi.mock("@stripe/stripe-js", () => ({
  loadStripe: () => Promise.resolve(null),
}));

// Prevent Stack Auth from initializing and looking for env vars
vi.mock("./stack", () => ({
  stackApp: {},
}));
