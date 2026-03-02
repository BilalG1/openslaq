import type { EphemeralMessage } from "@openslaq/shared";
import { handleStatus, handleRemind, handleInvite, handleMute, handleUnmute } from "./handlers";
import { executeBotCommand } from "./bot-command-executor";
import { BUILTIN_COMMANDS } from "./registry";

interface ExecuteResult {
  ok: boolean;
  ephemeralMessages?: EphemeralMessage[];
  error?: string;
}

const BUILTIN_HANDLERS: Record<
  string,
  (args: string, userId: string, channelId: string) => Promise<EphemeralMessage[]>
> = {
  status: handleStatus,
  remind: handleRemind,
  invite: handleInvite,
  mute: handleMute,
  unmute: handleUnmute,
};

export async function executeCommand(
  command: string,
  args: string,
  userId: string,
  workspaceId: string,
  channelId: string,
): Promise<ExecuteResult> {
  // Check built-in commands
  const handler = BUILTIN_HANDLERS[command];
  if (handler) {
    const ephemeralMessages = await handler(args, userId, channelId);
    return { ok: true, ephemeralMessages };
  }

  // Check if it's a known built-in (shouldn't happen, but guard)
  const isBuiltin = BUILTIN_COMMANDS.some((c) => c.name === command);
  if (isBuiltin) {
    return { ok: false, error: `Command /${command} is not yet implemented.` };
  }

  // Try bot commands
  const ephemeralMessages = await executeBotCommand(command, args, userId, workspaceId, channelId);
  if (ephemeralMessages.length > 0) {
    return { ok: true, ephemeralMessages };
  }

  return { ok: false, error: `Unknown command: /${command}` };
}
