import { StackClientApp } from "@stackframe/react";
import { useNavigate } from "react-router";
import { env } from "./env";

// Stack Auth client configuration for React SPA
// See: https://stack-auth.com/docs/sdk/objects/stack-app#stackclientapp
export const stackApp = new StackClientApp({
  projectId: env.VITE_STACK_PROJECT_ID,
  publishableClientKey: env.VITE_STACK_PUBLISHABLE_CLIENT_KEY,
  tokenStore: "cookie",
  redirectMethod: { useNavigate },
});
