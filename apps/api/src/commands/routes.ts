import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { WorkspaceMemberEnv } from "../workspaces/role-middleware";
import { BEARER_SECURITY, jsonBody, jsonContent } from "../lib/openapi-helpers";
import { rlRead } from "../rate-limit";
import { listCommandsForWorkspace } from "./registry";
import { executeCommand } from "./execute";
import { jsonResponse } from "../openapi/responses";
import { errorSchema } from "../openapi/schemas";
import { getWorkspaceMemberContext } from "../lib/context";

const slashCommandDefSchema = z.object({
  name: z.string(),
  description: z.string(),
  usage: z.string(),
  source: z.enum(["builtin", "bot", "integration"]),
  botAppId: z.string().optional(),
  botName: z.string().optional(),
});

const ephemeralMessageSchema = z.object({
  id: z.string(),
  channelId: z.string(),
  text: z.string(),
  senderName: z.string(),
  senderAvatarUrl: z.string().nullable(),
  createdAt: z.string(),
  ephemeral: z.literal(true),
});

const listCommandsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Commands"],
  summary: "List available slash commands",
  description: "Returns all available slash commands (built-in + bot-registered) for the workspace.",
  security: BEARER_SECURITY,
  middleware: [rlRead] as const,
  responses: {
    200: jsonContent(z.array(slashCommandDefSchema), "List of commands"),
  },
});

const executeCommandRoute = createRoute({
  method: "post",
  path: "/execute",
  tags: ["Commands"],
  summary: "Execute a slash command",
  description: "Executes a slash command and returns ephemeral response messages.",
  security: BEARER_SECURITY,
  request: {
    body: jsonBody(z.object({
      command: z.string().min(1),
      args: z.string().default(""),
      channelId: z.string().uuid(),
    })),
  },
  responses: {
    200: jsonContent(z.object({
      ok: z.boolean(),
      ephemeralMessages: z.array(ephemeralMessageSchema).optional(),
      error: z.string().optional(),
    }), "Command execution result"),
    400: jsonContent(errorSchema, "Invalid request"),
  },
});

const app = new OpenAPIHono<WorkspaceMemberEnv>()
  .openapi(listCommandsRoute, async (c) => {
    const workspace = c.get("workspace");
    const commands = await listCommandsForWorkspace(workspace.id);
    return jsonResponse(c, commands, 200);
  })
  .openapi(executeCommandRoute, async (c) => {
    const { user, workspace } = getWorkspaceMemberContext(c);
    const { command, args, channelId } = c.req.valid("json");
    const result = await executeCommand(command, args, user.id, workspace.id, channelId);
    return jsonResponse(c, result, 200);
  });

export default app;
