import type { EphemeralMessage } from "@openslaq/shared";
import { asChannelId, asUserId } from "@openslaq/shared";
import { handleStatus, handleRemind, handleInvite, handleMute, handleUnmute } from "./handlers";
import { executeBotCommand } from "./bot-command-executor";
import { BUILTIN_COMMANDS } from "./registry";
import { isChannelMember } from "../channels/service";
import { INTEGRATION_PLUGINS } from "../integrations/registry";

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
  // Check integration plugin commands
  const plugin = INTEGRATION_PLUGINS.find((p) => p.slashCommand?.definition.name === command);
  if (plugin?.slashCommand) {
    const isMember = await isChannelMember(asChannelId(channelId), asUserId(userId));
    if (!isMember) {
      return { ok: false, error: "You are not a member of this channel." };
    }
    const ephemeralMessages = await plugin.slashCommand.handler(args, userId, channelId, workspaceId);
    return { ok: true, ephemeralMessages };
  }

  // Check built-in commands
  const handler = BUILTIN_HANDLERS[command];
  if (handler) {
    // All channel-scoped commands require channel membership (except /status which is global)
    if (command !== "status") {
      const isMember = await isChannelMember(asChannelId(channelId), asUserId(userId));
      if (!isMember) {
        return { ok: false, error: "You are not a member of this channel." };
      }
    }
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
