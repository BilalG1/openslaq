import { StackServerApp } from "@stackframe/js";
import { env } from "../env";

let instance: StackServerApp | null = null;

export function getStackServerApp(): StackServerApp {
  if (!env.VITE_STACK_PROJECT_ID) {
    throw new Error("VITE_STACK_PROJECT_ID is not configured (requires AUTH_MODE=stack-auth)");
  }
  if (!env.STACK_SECRET_SERVER_KEY) {
    throw new Error("STACK_SECRET_SERVER_KEY is not configured");
  }
  if (!instance) {
    instance = new StackServerApp({
      projectId: env.VITE_STACK_PROJECT_ID,
      secretServerKey: env.STACK_SECRET_SERVER_KEY,
      publishableClientKey: env.VITE_STACK_PUBLISHABLE_CLIENT_KEY ?? undefined,
      tokenStore: "memory",
    });
  }
  return instance;
}
