import { Hono } from "hono";
import { env } from "../env";

const serverInfoRoutes = new Hono();

serverInfoRoutes.get("/server-info", (c) => {
  const base = {
    name: env.SERVER_NAME,
    version: "0.0.1",
  };

  if (env.AUTH_MODE === "builtin") {
    return c.json({
      ...base,
      auth: {
        type: "builtin" as const,
        methods: ["email-password"] as const,
      },
    });
  }

  return c.json({
    ...base,
    auth: {
      type: "stack-auth" as const,
      stackProjectId: env.VITE_STACK_PROJECT_ID!,
      stackPublishableKey: env.VITE_STACK_PUBLISHABLE_CLIENT_KEY ?? "",
    },
  });
});

export default serverInfoRoutes;
